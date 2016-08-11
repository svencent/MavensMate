/**
 * @file Responsible for CRUD of org connections (deploy targets)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var Promise                 = require('bluebird');
var _                 = require('lodash');
var fs                = require('fs-extra');
var path              = require('path');
var uuid              = require('node-uuid');
var SalesforceClient  = require('./sfdc-client');
var KeychainService   = require('./keychain');
var logger            = require('winston');

/**
 * Service to get, add, update, remove org connections for a given project
 * @param {Object} project - project instance
 */
function OrgConnectionService(project) {
  this.project = project;
  this.keychainService = new KeychainService();
}

/**
 * Lists all org connections for this project
 * @return {Array} - list of connections
 */
OrgConnectionService.prototype.listAll = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
      if (err) {
        if (err.message.indexOf('ENOENT') >= 0) {
          resolve([]);
        } else {
          reject(new Error('Could not load org connections: '+err.message));
        }
      } else {
        resolve(connections);
      }
    });
  });
};

/**
 * Returns the org connection by id
 * @return {Object} - connection
 */
OrgConnectionService.prototype.getById = function(id) {
  try {
    var connections = fs.readJsonSync(path.join(this.project.path, 'config', '.org_connections'));
    return _.find(connections, function(c) { return c.id === id; });
  } catch(e) {
    if (err.message.indexOf('ENOENT') >= 0) {
      return null;
    } else {
      throw e;
    }
  }
};

/**
 * Adds an org connection
 * @param {String} username
 * @param {String} password
 * @param {String} orgType - production, sandbox, developer
 */
OrgConnectionService.prototype.add = function(name, accessToken, refreshToken, instanceUrl) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var connectionId = uuid.v1();
    var newConnection = {
      name: name,
      id: connectionId,
      instanceUrl: instanceUrl
    };

    if (self.keychainService.useSystemKeychain()) {
      self.keychainService.storePassword(connectionId, accessToken, 'accessToken');
      self.keychainService.storePassword(connectionId, refreshToken, 'refreshToken');
    } else {
      newConnection.accessToken = accessToken;
      newConnection.refreshToken = refreshToken;
    }

    var orgConnectionClient = new SalesforceClient({
      accessToken: accessToken,
      refreshToken: refreshToken,
      instanceUrl: instanceUrl
    });
    orgConnectionClient.initialize()
      .then(function() {
        if (!fs.existsSync(path.join(self.project.path, 'config', '.org_connections'))) {
          fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify([newConnection], null, 4), function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
            if (err) {
              reject(err);
            } else {
              connections.push(newConnection);
              fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify(connections, null, 4), function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }
          });
        }
      })
      .catch(function(err) {
        logger.error('could not initialize sfdc client for org connection: '+err.message);
        reject(err);
      })
      .done();

  });
};

/**
 * Updates an org connection by id
 * @param  {String} id
 * @param  {String} username
 * @param  {String} password
 * @param  {String} orgType
 * @return {Promise}
 */
OrgConnectionService.prototype.update = function(id, accessToken, refreshToken, instanceUrl) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(path.join(self.project.path, 'config', '.org_connections'))) {
      fs.writeSync(path.join(self.project.path, 'config', '.org_connections'), []);
    }
    fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
      if (err) {
        reject(new Error('Could not load org connections: '+err.message));
      } else {
        _.each(connections, function(c) {
          if (c.id === id) {
            c.username = username;
            c.orgType = orgType.toLowerCase();
            c.loginUrl = loginUrl;
            if (self.keychainService.useSystemKeychain()) {
              self.keychainService.replacePassword(c.id, accessToken, 'accessToken');
              self.keychainService.replacePassword(c.id, refreshToken, 'refreshToken');
            } else {
              c.accessToken = accessToken;
              c.refreshToken = refreshToken;
            }
            return false;
          }
        });
        fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify(connections, null, 4), function(err) {
          if (err) {
            reject(new Error('Could not update org connections: '+err.message));
          } else {
            resolve();
          }
        });
      }
    });
  });
};

/**
 * Removes an org connection
 * @param  {String} id
 * @return {Promise}
 */
OrgConnectionService.prototype.remove = function(id) {
  var self = this;
  return new Promise(function(resolve, reject) {
    fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
      if (err) {
        reject(new Error('Could not load org connections: '+err.message));
      } else {
        var newConnections = [];
        _.each(connections, function(c) {
          if (c.id !== id) {
            newConnections.push(c);
          }
        });
        fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify(newConnections, null, 4), function(err) {
          if (err) {
            reject(new Error('Could not write org connections: '+err.message));
          } else {
            resolve();
          }
        });
      }
    });
  });
};

module.exports = OrgConnectionService;