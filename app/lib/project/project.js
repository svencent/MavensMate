var Promise           = require('bluebird');
var _                 = require('lodash');
var gracefulRename    = Promise.promisify(require('graceful-fs').rename);
var path              = require('path');
var fs                = require('fs-extra-promise');
var uuid              = require('uuid');
var util              = require('../util');
var temp              = require('temp');
var projectUtil       = require('./util');
var logger            = require('winston');
var ProjectJson       = require('./project-json');
var config            = require('../../config');
var Config            = require('./config');
var Credentials       = require('./credentials');
var Debug             = require('./debug');
var LocalStore        = require('./local-store');
var ServerStore       = require('./server-store');
var LogService        = require('../services/log');
var SalesforceClient  = require('../sfdc-client');
var Package           = require('../package');
var EditorService     = require('../services/editor');
var packageExceptions = require('../package/exceptions');

// TODOS
// 1. watch package.xml, offer to refresh from server?

var Project = function(path) {
  this.path = path;
};

Project.prototype.hasInvalidSalesforceConnection;
Project.prototype.projectJson;
Project.prototype.config;
Project.prototype.debug;
Project.prototype.packageXml;
Project.prototype.localStore;
Project.prototype.logService;
Project.prototype.serverStore;
Project.prototype.id;
Project.prototype.sfdcClient;
Project.prototype.credentials;
Project.prototype._connections = []; // array of deployment connections

Project.prototype.initialize = function() {
  logger.debug('initializing project at path', this.path);
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(self.path)) {
      return reject(new Error('Project path does not exist on the file system.'));
    }
    if (!self._isMavensMateProject()) {
      return reject(new Error('Invalid MavensMate project structure. Non-MavensMate projects can be converted with the "convert-project" command.'));
    }

    self.projectJson = new ProjectJson(self);
    self.config = new Config(self);
    self.debug = new Debug(self);
    self.packageXml = new Package(self);
    self.localStore = new LocalStore(self);
    self.serverStore = new ServerStore(self);
    self.credentials = new Credentials(self);
    self.name = self.projectJson.get('projectName');
    self.id = self.projectJson.get('id');
    Promise.all([
      self.initializeSalesforceClient(),
      self.serverStore.initialize(),
      self.packageXml.initializeFromPath(path.join(self.path,'src','package.xml')),
    ])
    .then(function() {
      self._watchPackageXml();
      resolve(self);
    })
    .catch(function(err) {
      logger.error('Failed to initialize project', err);
      reject(err);
    });
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
        self.logService = new LogService(self);
        self.credentials.observeTokenRefresh(self.sfdcClient);
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

Project.prototype._watchPackageXml = function() {
  var self = this;
  fs.watchFile(self.packageXml.path, function() {
    self.packageXml.refreshContentsFromDisk()
      .then(function(res) {
        logger.debug('package.xml refreshed from disk');
      })
      .catch(function(err) {
        logger.error('could not refresh package.xml from disk')
      });
  });
};

/**
 * Whether this is a valid MavensMate project structure
 * @return {Boolean}
 */
Project.prototype._isMavensMateProject = function() {
  if (
    fs.existsSync(path.join(this.path, '.mavensmate')) &&
    fs.existsSync(path.join(this.path, 'src')) &&
    fs.existsSync(path.join(this.path, 'src', 'package.xml'))
  ) {
      return true;
    } else {
      return false;
    }
}

/**
 * Updates project with new package.xml contents
 * @param  {Object} pkg - salesforce package in JSON format
 * @return {Promise}
 */
Project.prototype.update = function(pkg) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var tmpPath = temp.mkdirSync({ prefix: 'mm_' });
    var tmpUnpackagedPath = path.join(tmpPath, 'unpackaged');
    var serverProperties;
    self.sfdcClient.retrieveUnpackaged(pkg, true, tmpPath)
      .then(function(retrieveResult) {
        serverProperties = retrieveResult.fileProperties;
        var srcPath = path.join(self.path, 'src');
        util.emptyDirectoryRecursiveSync(srcPath);
        util.removeEmptyDirectoriesRecursiveSync(srcPath);
        return projectUtil.copy(tmpUnpackagedPath, srcPath, true);
      })
      .then(function() {
        return Promise.all([
          self.localStore.clean(serverProperties),
          self.serverStore.refresh(self.sfdcClient, self.projectJson.get('subscription'))
        ]);
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Packages project src directory for compilation
 * @return {Promise}
 */
Project.prototype.compile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var newPath = temp.mkdirSync({ prefix: 'mm_' });
    var deployResult;
    fs.copy(path.join(self.path, 'src'), path.join(newPath, 'unpackaged'), function(err) {
      if (err) { return reject(err); }
      util.zipDirectory(path.join(newPath, 'unpackaged'), newPath)
        .then(function() {
          var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
          return self.sfdcClient.deploy(zipStream, { rollbackOnError : true, performRetrieve: true });
        })
        .then(function(result) {
          logger.debug('Project compile result', result);
          deployResult = result;
          return self.localStore.update(deployResult.details.retrieveResult.fileProperties);
        })
        .then(function() {
          resolve(deployResult);
        })
        .catch(function(error) {
          reject(error);
        });
    });
  });
};

/**
 * Removes from the local file system
 * @return {void}
 */
Project.prototype.delete = function() {
  fs.removeSync(this.path);
};

/**
 * 1. Wipe project clean locally, restore from server based on package.xml
 * 2. Rewrite server.json and local.json
 * @return {Promise}
 */
Project.prototype.clean = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.packageXml.refreshContentsFromDisk()
      .then(function() {
        return self.update(self.packageXml.contents)
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
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
    var subscription = pkg ? Object.keys(pkg) : [];

    if (fs.existsSync(projectPath)) {
      return reject(new Error('Project path already exists on the file system.'));
    }

    fs.mkdirSync(projectPath);

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
    EditorService.putConfig(projectPath);

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
    EditorService.putConfig(projectPath);
    return new Project(projectPath);
  });
}

module.exports = Project;