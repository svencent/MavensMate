/**
 * @file Responsible for deployment of Salesforce metadata (Custom Objects, Apex Classes, Lightning files, etc.) to other servers
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var Promise               = require('bluebird');
var _                     = require('lodash');
var temp                  = require('temp');
var swig                  = require('swig');
var fs                    = require('fs-extra');
var path                  = require('path');
var util                  = require('./util').instance;
var events                = require('events');
var inherits              = require('inherits');
var SalesforceClient      = require('./sfdc-client');
var OrgConnectionService  = require('./org-connection');
var Package               = require('./package').Package;
var MetadataHelper        = require('./metadata').MetadataHelper;
var logger                = require('winston');
var config                = require('./config');
var mavensMateFile        = require('./file');

// TODO: create tmp directory on instantiation, set as property
// TODO: refactor execute... methods

/**
 * Represents a deployment to one or more Salesforce.com servers
 * @param {Object} opts
 * @param {Array} opts.project - Project instance
 * @param {Array} opts.sfdcClient - Sfdc Client instance
 * @param {Array} opts.destinations - array of org connections
 * @param {Array} opts.checkOnly - whether this is a validate-only deployment
 * @param {Array} opts.runTests - whether to run tests during this deployment
 * @param {Array} opts.rollbackOnError - whether to rollback when the deployment fails
 * @param {Array} opts.package - deployment payload
 * @param {Array} opts.newDeploymentName - the name of the deployment to be saved for future deploys
 * @param {Array} opts.debugCategories - array of debug categories for the deployment
 */
function Deploy(opts) {
  util.applyProperties(this, opts);
  this.sfdcClient = this.project ? this.project.sfdcClient : this.sfdcClient;
  this.metadataHelper = new MetadataHelper({ sfdcClient: this.sfdcClient });
}

inherits(Deploy, events.EventEmitter);

Deploy.prototype._getTargetIds = function() {
  return this.destinations || [];
};

Deploy.prototype.getNamedDeployments = function() {
  var self = this;
  if (!self.project) {
    throw new Error('No project found');
  }
  var namedDeployments = [];
  // this is the default deployment, based on the project's package.xml
  namedDeployments.push({
    name: 'Project package.xml',
    path: path.join(self.project.path, 'src', 'package.xml')
  });
  if (!fs.existsSync(path.join(this.project.path, 'deploy'))) {
    return namedDeployments;
  } else {
    // these are custom "named deploys"
    _.each(util.listDirectories(path.join(this.project.path, 'deploy')), function(savedDeployPath) {
      namedDeployments.push({
        name: path.basename(savedDeployPath),
        path: path.join(savedDeployPath, 'unpackaged', 'package.xml')
      });
    });
    return namedDeployments;
  }
};

/**
 * Compiles files via Metadata API, updates local store based on deploy result
 * @param  {Array of Metadata} metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
Deploy.prototype.compileWithMetadataApi = function(files, subscription) {
  var self = this;
    return new Promise(function(resolve, reject) {

    logger.debug('compiling metadata via metadata api: ');
    // logger.debug(metadata);
    var deployResult;
    self.stage(files, subscription)
      .then(function(zipStream) {
        return self.project.sfdcClient.deploy(zipStream, { rollbackOnError : true, performRetrieve: true });
      })
      .then(function(result) {
        logger.debug('Compile result: ');
        logger.debug(result);
        deployResult = result;
        if (deployResult.details.retrieveResult) {
          return self.project.updateLocalStore(deployResult.details.retrieveResult.fileProperties);
        } else {
          return new Promise(function(resolve) {
            resolve();
          });
        }
      })
      .then(function() {
        resolve(deployResult);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

Deploy.prototype.executeRemote = function(deployOptions) {
  var self = this;
  self.orgConnectionService = new OrgConnectionService(self.project);

  logger.debug('deploying to remote');

  return new Promise(function(resolve, reject) {
    if (!self._getTargetIds() || self._getTargetIds().length === 0) {
      return reject(new Error('Please specify at least one destination'));
    }

    var deployPromises = [];
    deployOptions = deployOptions || {
      rollbackOnError: true,
      performRetrieve: true
    };

    var newPath = temp.mkdirSync({ prefix: 'mm_' });
    var retrieveResultStream;
    // var fileProperties;
    self.project.sfdcClient.retrieveUnpackaged(self.package, true, newPath)
      .then(function(retrieveResult) {
        logger.debug('retrieved deployment payload from remote, preparing to deploy to targets');
        logger.debug(self._getTargetIds());
        if (config.get('mm_archive_deployments') === true) {
          // todo
        }
        if (self.deploymentName) {
          if (fs.existsSync(path.join(self.project.path, 'deploy', self.deploymentName))) {
            fs.removeSync(path.join(self.project.path, 'deploy', self.deploymentName));
            fs.copySync(path.join(newPath, 'unpackaged'), path.join(self.project.path, 'deploy', self.deploymentName, 'unpackaged'));
          } else {
            fs.ensureDirSync(path.join(self.project.path, 'deploy', self.deploymentName, 'unpackaged'));
            fs.copySync(path.join(newPath, 'unpackaged'), path.join(self.project.path, 'deploy', self.deploymentName, 'unpackaged'));
          }
        }
        _.each(self._getTargetIds(), function(targetId) {
          logger.debug('adding deploy target id: ', targetId);
          logger.debug('deploy options', deployOptions);
          var targetConnection = self.orgConnectionService.getById(targetId);
          logger.debug('targetConnection', targetConnection);
          deployPromises.push(self._deployToTarget(targetConnection, newPath, deployOptions));
        });
        return Promise.all(deployPromises);
      })
      .then(function(deployResults) {
        var result = {};
        _.each(deployResults, function(deployResult) {
          var connectionName = Object.keys(deployResult)[0];
          result[connectionName] = deployResult[connectionName];
          if (result[connectionName].details.componentFailures) {
            if (!_.isArray(result[connectionName].details.componentFailures)) {
              result[connectionName].details.componentFailures = [result[connectionName].details.componentFailures];
            }
          }
          if (result[connectionName].details.componentSuccesses) {
            if (!_.isArray(result[connectionName].details.componentSuccesses)) {
              result[connectionName].details.componentSuccesses = [result[connectionName].details.componentSuccesses];
            }
          }
          if (result[connectionName].details.runTestResult && result[connectionName].details.runTestResult.codeCoverageWarnings) {
            if (!_.isArray(result[connectionName].details.runTestResult.codeCoverageWarnings)) {
              result[connectionName].details.runTestResult.codeCoverageWarnings = [result[connectionName].details.runTestResult.codeCoverageWarnings];
            }
          }
        });
        resolve(result);
      })
      .catch(function(err) {
        logger.error('Could not complete deployment: '+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Takes an array of Metadata instances and prepares a local deployment zip to be passed to the Metadata API for deployment
 * @param  {Array} of type Metadata - metadata
 * @return {Promise} resolves with zip stream
 */
Deploy.prototype.stage = function(files, subscription) {
  var self = this;
  return new Promise(function(resolve, reject) {

    // TODO: handle folder-based metadata, like documents, templates
    // recurse upward looking for valid folder name, if reach path.join(workspace, projectname), then not valid?

    // writes temp directory, puts zip file inside
    var newPath = temp.mkdirSync({ prefix: 'mm_' });
    fs.mkdirpSync(path.join(newPath, 'unpackaged'));

    var pkg = new Package({ subscription: subscription });
    pkg.init()
      .then(function() {
        pkg.path = path.join(newPath, 'unpackaged', 'package.xml');
        pkg.writeFileSync();

        _.each(files, function(f) {

          logger.debug('STAGING: '+f.path);
          var filePath = f.path;
          // filePath => /foo/bar/myproject/unpackaged/classes/myclass.cls

          var fileBasename = path.basename(filePath);
          // fileBaseName => myclass.cls

          logger.debug('fileBasename: '+fileBasename);

          var directory = path.dirname(filePath);
          // directory => /foo/bar/myproject/unpackaged/classes

          logger.debug('directory: '+directory);

          var projectSrc = path.join(self.project.workspace, self.project.name, 'src');
          var destinationDirectory = directory.replace(projectSrc, path.join(newPath, 'unpackaged'));
          // destinationDirectory => /foo/bar/myproject/unpackaged/classes

          logger.debug('destinationDirectory: '+destinationDirectory);

          // make directory if it doesnt exist (parent dirs included)
          if (!fs.existsSync(destinationDirectory)) {
            fs.mkdirpSync(destinationDirectory);
          }

          // copy to tmp
          fs.copySync(filePath, path.join(destinationDirectory, fileBasename));

          if (f.hasMetaFile) {
            if (f.isMetaFile) {
              fs.copySync(filePath.replace('-meta.xml',''), path.join(destinationDirectory, fileBasename.replace('-meta.xml', '')));
            } else {
              fs.copySync(filePath+'-meta.xml', path.join(destinationDirectory, fileBasename+'-meta.xml'));
            }
          }
        });
        return util.zipDirectory(path.join(newPath, 'unpackaged'), newPath);
      })
      .then(function() {
        var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
        resolve(zipStream);
      })
      .catch(function(err) {
        logger.debug('Could not prepare metadata for deployment: '+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Deploys zipStream to project's sfdcClient
 * @param  {Stream} zipStream - zipped deployment
 * @return {[type]}           [description]
 */
Deploy.prototype.executeStream = function(zipStream, opts) {
  var self = this;
  var deployOptions = opts || {};
  deployOptions.rollbackOnError = true;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.deploy(zipStream, deployOptions)
      .then(function(result) {
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

// TODO: CHANGE METADATA TO FILE!!!

/**
 * Deploys file instance to server, creating a server copy, places in self.project
 * @return {Promise} - resolves with Object response from Salesforce
 */
Deploy.prototype.execute = function(file, deployOptions) {
  var self = this;
  return new Promise(function(resolve, reject) {

    if (!deployOptions) {
      deployOptions = {
        rollbackOnError: true
      };
    }

    var newPath = temp.mkdirSync({ prefix: 'mm_' });
    logger.debug('deploying file: ');

    var pkg = new Package({ subscription: mavensMateFile.createPackageSubscription([file]) });
    pkg.init()
      .then(function() {
        pkg.path = path.join(newPath, 'unpackaged', 'package.xml');
        pkg.writeFileSync();
        return file.renderAndWriteToDisk(path.join(newPath, 'unpackaged'));
      })
      .then(function() {
        return util.zipDirectory(path.join(newPath, 'unpackaged'), newPath);
      })
      .then(function() {
        var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
        return self.project.sfdcClient.deploy(zipStream, deployOptions);
      })
      .then(function(result) {
        logger.debug('Creation result: ');
        logger.debug(result);
        if (result.success) {
          var metadataPath = path.join(newPath, 'unpackaged', file.type.directoryName, file.name+'.'+file.type.suffix);
          // metadataPath => /my/tmp/directory/unpackaged/classes/myclass.cls

          var fileBasename = path.basename(metadataPath);
          // fileBaseName => myclass.cls

          var directory = path.dirname(metadataPath);
          // directory => /my/tmp/directory/unpackaged/classes

          var projectSrc = path.join(self.project.workspace, self.project.name, 'src');
          // projectSrc => /foo/bar/myproject/src

          var destinationDirectory = directory.replace(path.join(newPath, 'unpackaged'), projectSrc);
          // destinationDirectory => /foo/bar/myproject/src/classes

          // make directory if it doesnt exist (parent dirs included)
          if (!fs.existsSync(destinationDirectory)) {
            fs.mkdirpSync(destinationDirectory);
          }

          // copy to project
          // console.log(metadataPath);
          // console.log(path.join(destinationDirectory, fileBasename));
          fs.copySync(metadataPath, path.join(destinationDirectory, fileBasename));

          if (file.hasMetaFile) {
            fs.copySync(metadataPath+'-meta.xml', path.join(destinationDirectory, fileBasename+'-meta.xml'));
          }
        }
        resolve(result);
      })
      .catch(function(err) {
        logger.debug('Error deploying new file to server');
        logger.debug(err);
        logger.debug(err.stack);
        if (err.message.indexOf('polling time out') >= 0) {
            reject(new Error('MavensMate timed out while polling Salesforce.com servers. To increase polling timeout, set mm_timeout to number of seconds.'));
        } else {
            reject(err);
        }
      })
      .done();
  });
};

Deploy.prototype._deployToTarget = function(target, deployPath, deployOptions) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('deploying to target: ');
    logger.debug(target);

    // if using keyring, retrieve password (otherwise it will be a property of the target)
    if (!target.accessToken && !target.refreshToken) {
      target.accessToken = self.project.keychainService.getPassword(target.id, 'accessToken');
      target.refreshToken = self.project.keychainService.getPassword(target.id, 'refreshToken');
    }

    var deployClient;
    var deployStream;

    logger.debug('READY TO DEPLOY: ');
    logger.debug(target.name);
    logger.silly(target.accessToken);
    logger.silly(target.refreshToken);
    logger.debug(target.instanceUrl);

    logger.debug('deploy options:');
    logger.debug(deployOptions);

    util.zipDirectory(path.join(deployPath, 'unpackaged'), deployPath)
      .then(function() {
        deployClient = new SalesforceClient({
          accessToken: target.accessToken,
          refreshToken: target.refreshToken,
          instanceUrl: target.instanceUrl
        });
        return deployClient.initialize();
      })
      .then(function() {
        deployClient.setPollingTimeout(300000); // TODO: make configurable from UI
        deployStream = fs.createReadStream(path.join(deployPath, 'unpackaged.zip'));
        return deployClient.deploy(deployStream, deployOptions);
      })
      .then(function(deployResult) {
        var result = {};
        result[target.name] = deployResult;
        resolve(result);
      })
      .catch(function(err) {
        logger.debug('_deployToTarget failed: '+target.name+', '+err.message);
        logger.debug(err);
        reject(err);
      })
      .done();
  });
};

/**
 * Takes an array of Metadata instances and prepares a local deployment zip to be passed to the Metadata API for deletion
 * @param  {Array} of type Metadata - metadata
 * @return {Promise} resolves with zip stream
 */
Deploy.prototype.stageDelete = function(subscription) {
  return new Promise(function(resolve, reject) {
    // TODO: handle folder-based metadata, like documents, templates
    // recurse upward looking for valid folder name, if reach path.join(workspace, projectname), then not valid?

    // writes temp directory, puts zip file inside
    var newPath = temp.mkdirSync({ prefix: 'mm_' });

    fs.mkdirpSync(path.join(newPath, 'unpackaged'));

    var pkg = new Package({ subscription: subscription });
    var emptyPackage = new Package({ subscription: {} });
    pkg.init()
      .then(function() {
        pkg.path = path.join(newPath, 'unpackaged', 'destructiveChanges.xml');
        pkg.writeFileSync();
        emptyPackage = new Package({ subscription: {} });
        return emptyPackage.init();
      })
      .then(function() {
        emptyPackage.path = path.join(newPath, 'unpackaged', 'package.xml');
        emptyPackage.writeFileSync();
        return util.zipDirectory(path.join(newPath, 'unpackaged'), newPath);
      })
      .then(function() {
        var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
        resolve(zipStream);
      })
      .catch(function(err) {
        logger.debug('Could not prepare metadata for deletion: '+err);
        reject(err);
      })
      .done();
  });
};


module.exports = Deploy;
