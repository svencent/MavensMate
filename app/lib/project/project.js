var Promise           = require('bluebird');
var gracefulRename    = Promise.promisify(require('graceful-fs').rename);
var path              = require('path');
var fs                = require('fs-extra-promise');
var uuid              = require('uuid');
var util              = require('../util');
var logger            = require('winston');
var ProjectJson       = require('./project-json');
var config            = require('../../config');
var Config            = require('./config');
var Credentials       = require('./credentials');
var Debug             = require('./debug');
var LocalStore        = require('./local-store');
var SalesforceClient  = require('../sfdc-client');
var Package           = require('../package');

// TODOS
// 1. watch package.xml, offer to refresh from server?

var Project = function(path) {
  this.path = path;
  if (!fs.existsSync(this.path)) {
    throw new Error('Project path does not exist on the file system.');
  }
  if (!this._isMavensMateProject()) {
    throw new Error('Invalid MavensMate project. Non-MavensMate projects can be converted with the "convert-project" command.');
  }
};

Project.prototype.hasInvalidSalesforceConnection;
Project.prototype.sfdcClient;
Project.prototype._documents = []; // [ Document, Document, Document ]
Project.prototype._connections = []; // array of deployment connections

Project.prototype.initialize = function() {
  logger.debug('initializing project at path', this.path);
  var self = this;
  return new Promise(function(resolve, reject) {
    self.projectJson = new ProjectJson(self);
    self.config = new Config(self);
    self.debug = new Debug(self);
    self.localStore = new LocalStore(self);
    self.name = self.projectJson.get('projectName');
    self.id = self.projectJson.get('id');
    self.initializeSalesforceClient()
      .then(function() {
        self.packageXml = new Package(self);
        return self.packageXml.initializeFromPath(path.join(self.path,'src','package.xml'));
      })
      .then(function() {
        resolve(self);
      })
      .catch(function(err) {
        logger.error('Could not initialize SalesforceClient', err);
        reject(err);
      })
  });
};

Project.prototype.initializeSalesforceClient = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var creds = Credentials.getForProject(self);
    if (creds.refreshToken) {
      self.sfdcClient = new SalesforceClient({
        username: self.projectJson.get('username'),
        accessToken: creds.accessToken,
        refreshToken: creds.refreshToken,
        instanceUrl: self.projectJson.get('instanceUrl'),
        loginUrl: self.projectJson.get('loginUrl'),
        orgType: self.projectJson.get('orgType'),
        apiVersion: self.config.get('mm_api_version')
      });
    } else {
      self.sfdcClient = new SalesforceClient({
        username: self.projectJson.get('username'),
        password: creds.password,
        loginUrl: self.projectJson.get('loginUrl'),
        orgType: self.projectJson.get('orgType'),
        apiVersion: self.config.get('mm_api_version')
      });
    }
    self.sfdcClient.initialize()
      .then(function() {
        self.creds = new Credentials(self);
        self.hasInvalidSalesforceConnection = false;
        resolve();
      })
      .catch(function(err) {
        if (util.isCredentialsError(err)) {
          logger.warn('Project has expired access/refresh token, marking hasInvalidSalesforceConnection');
          self.hasInvalidSalesforceConnection = true;
          resolve();
        } else {
          reject(err);
        }
      })
  });
};

/**
 * Whether this is a valid MavensMate project structure
 * @return {Boolean}
 */
Project.prototype._isMavensMateProject = function() {
  return true;
}

/**
 * Updates package.xml, should refresh that package.xml from server
 * @return {Promise}
 */
Project.prototype.update = function() {

};

/**
 * Removes from the local file system
 * @return {Promise}
 */
Project.prototype.delete = function() {
  fs.removeSync(this.path);
};

/**
 * 1. Wipe project clean locally, restore from server based on package.xml
 * 2. Rewrite config
 * @return {Promise}
 */
Project.prototype.clean = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.sfdcClient.retrieveUnpackaged(pkg, true, projectPath)
      .then(function(retrieveResult) {
        fileProperties = retrieveResult.fileProperties;
        var unpackagedPath = path.join(projectPath, 'unpackaged');
        var srcPath = path.join(projectPath, 'src');
        if (fs.existsSync(unpackagedPath)) {
          // IMPORTANT: we must use graceful-fs.rename here to avoid windows antivirus EPERM issues
          return gracefulRename(unpackagedPath, srcPath);
        } else {
          // can be an empty project
          Promise.resolve();
        }
      })
      .then(function() {
        return LocalStore.create(projectPath, fileProperties);
      })
  });
};

/**
 * Creates a net-new project on the disk
 * @return {Project}
 */
Project.create = function(opts) {
  return new Promise(function(resolve, reject) {
    var projectId = uuid.v4();
    var name = opts.name;
    var workspace = opts.workspace;
    var projectPath = path.join(workspace, name);
    var sfdcClient = opts.sfdcClient;
    var pkg = opts.package;
    var subscription = Object.keys(pkg);

    if (fs.existsSync(projectPath)) {
      throw new Error('Project path already exists on the file system. Did you mean to convert this project, instead?')
    } else {
      fs.mkdirSync(projectPath);
    }

    // initiate .mavensmate config
    ProjectJson.create(projectPath, sfdcClient, {
      id: projectId,
      projectName: name,
      workspace: workspace,
      subscription: subscription
    });
    Config.create(projectPath, {
      'mm_api_version': config.get('mm_api_version')
    });
    Debug.create(projectPath, sfdcClient);
    Credentials.create(projectPath, projectId, sfdcClient);

    var fileProperties;
    // get server contents and write locally
    sfdcClient.retrieveUnpackaged(pkg, true, projectPath)
      .then(function(retrieveResult) {
        fileProperties = retrieveResult.fileProperties;
        var unpackagedPath = path.join(projectPath, 'unpackaged');
        var srcPath = path.join(projectPath, 'src');
        if (fs.existsSync(unpackagedPath)) {
          // IMPORTANT: we must use graceful-fs.rename here to avoid windows antivirus EPERM issues
          return gracefulRename(unpackagedPath, srcPath);
        } else {
          // can be an empty project
          Promise.resolve();
        }
      })
      .then(function() {
        return LocalStore.create(projectPath, fileProperties);
      })
      .then(function() {
        return new Project(projectPath).initialize();
      })
      .then(function(project) {
        resolve(project)
      })
      .catch(function(err) {
        logger.error('Project creation failed', err);
        if (fs.existsSync(projectPath)) fs.removeSync(projectPath);
        reject(err);
      });
  });
}

/**
 * Converts an existing directory on the disk to a MavensMate project
 * @param  {Object} opts
 * @param  {String} opts.path - origin path
 * @return {Project}
 */
Project.convert = function(opts) {
  return new Promise(function(resolve, reject) {
    var path = opts.path;
    var workspace = path.dirname(path);
    var workspaceConfig = config.get('mm_workspace');
    // if the path's dirname isn't a mm workspace, make it so
    if (_.isString(workspaceConfig) && workspace !== workspaceConfig) {
      var workspaceSettingArray = [
        workspaceConfig,
        workspace
      ];
      config.set('mm_workspace', workspaceSettingArray);
      config.save();
    } else if (_.isArray(workspaceConfig) && workspaceConfig.indexOf(workspace) === -1) {
      workspaceConfig.push(workspace);
      config.set('mm_workspace', workspaceConfig);
      config.save();
    }
    var name = path.basename(path);
    var projectPath = path.join(workspace, name);
    var projectId = uuid.v4();
    ProjectJson.create(projectPath, sfdcClient, {
      id: projectId,
      projectName: name,
      workspace: workspace,
      subscription: subscription
    });
    Config.create(projectPath);
    Debug.create(projectPath, sfdcClient);
    Credentials.create(projectPath, projectId, sfdcClient);
    return new Project(projectPath);
  });
}

module.exports = Project;