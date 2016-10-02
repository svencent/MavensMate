var Package = require('../package');
var path = require('path');
var fs = require('fs-extra-promise');
var temp = require('temp');
var _ = require('lodash');
var logger = require('winston');
var util = require('../util');
var keychain = require('../services/keychain');
var Deploy = require('./deploy');
var SalesforceClient = require('../sfdc-client');

function RemoteDeploy(project, pkg, targets, deployOptions, deployName) {
  this._project = project;
  this._pkg = pkg;
  this._targets = targets;
  this._deployOptions = deployOptions;
  this._deployName = deployName;
}

RemoteDeploy.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var deployPath = temp.mkdirSync({ prefix: 'mm_' });
    self._project.sfdcClient.retrieveUnpackaged(self._pkg, true, deployPath)
      .then(function(retrieveResult) {
        if (self._deployName) {
          self._writeNamedDeployment(deployPath);
        }
        return util.zipDirectory(path.join(deployPath, 'unpackaged'), deployPath);
      })
      .then(function() {
        var getDeployClientPromises = [];
        _.each(self._targets, function(target) {
          getDeployClientPromises.push(self._getTargetSalesforceClient(target));
        });
        return Promise.all(getDeployClientPromises);
      })
      .then(function(deployClientResults) {
        var deployStream = fs.createReadStream(path.join(deployPath, 'unpackaged.zip'));
        var deployPromises = [];
        _.each(deployClientResults, function(deployClient) {
          deployPromises.push(deployClient.deploy(deployStream, self._deployOptions));
        });
        return Promise.all(deployPromises);
      })
      .then(function(deployResults) {
        logger.debug('deployResults', deployResults);
        var result = {};
        _.each(self._targets, function(target, index) {
          result[target.id] = deployResults[index];
        });
        resolve(result);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

RemoteDeploy.prototype._writeNamedDeployment = function(deployPath) {
  if (fs.existsSync(path.join(this._project.path, 'deploy', this._deployName))) {
    fs.removeSync(path.join(this._project.path, 'deploy', this._deployName));
    fs.copySync(path.join(deployPath, 'unpackaged'), path.join(this._project.path, 'deploy', this._deployName, 'unpackaged'));
  } else {
    fs.ensureDirSync(path.join(this._project.path, 'deploy', this._deployName, 'unpackaged'));
    fs.copySync(path.join(deployPath, 'unpackaged'), path.join(this._project.path, 'deploy', this._deployName, 'unpackaged'));
  }
};

RemoteDeploy.prototype._getTargetSalesforceClient = function(target) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // if using keyring, retrieve password (otherwise it will be a property of the target)
    if (target.username && !target.password) {
      target.password = keychain.getPassword(target.id, 'password');
    } else if (!target.password && !target.accessToken && !target.refreshToken) {
      target.accessToken = keychain.getPassword(target.id, 'accessToken');
      target.refreshToken = keychain.getPassword(target.id, 'refreshToken');
    }

    logger.debug('target -->', target);

    var deployClient;
    if (target.username && target.password) {
      deployClient = new SalesforceClient({
        username: target.username,
        password: target.password,
        orgType: target.orgType,
        loginUrl: target.loginUrl
      });
    } else {
      deployClient = new SalesforceClient({
        accessToken: target.accessToken,
        refreshToken: target.refreshToken,
        instanceUrl: target.instanceUrl
      });
    }
    deployClient.initialize()
      .then(function() {
        //todo: this merely sets an obnoxiously long deploy timeout...should we create a separate setting for deploy timeout?
        deployClient.setPollingTimeout((self._project.config.get('mm_timeout') || 600) * 10000);
        resolve(deployClient);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = RemoteDeploy;