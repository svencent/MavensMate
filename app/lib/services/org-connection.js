/**
 * @file Responsible for CRUD of org connections (deploy targets)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var Promise                 = require('bluebird');
var _                 = require('lodash');
var fs                = require('fs-extra');
var path              = require('path');
var uuid              = require('uuid');
var SalesforceClient  = require('../sfdc-client');
var KeychainService   = require('../services/keychain');
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
        _.each(connections, function(c) {
          if (self.keychainService.useSystemKeychain()) {
            c.accessToken = self.keychainService.getPassword(c.id, 'accessToken', true);
            c.refreshToken = self.keychainService.getPassword(c.id, 'refreshToken', true);
            c.password = self.keychainService.getPassword(c.id, 'password', true);
          }
        });
        logger.debug('returning all org connections', connections);
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
    if (e.message.indexOf('ENOENT') >= 0) {
      return null;
    } else {
      throw e;
    }
  }
};

/**
 * Adds an org connection
 * @param {Object} opts
 * @param {String} opts.name
 * @param {String} opts.accessToken
 * @param {String} opts.refreshToken
 * @param {String} opts.username
 * @param {String} opts.password
 * @param {String} opts.instanceUrl
 * @param {String} opts.orgType
 * @param {String} opts.loginUrl
 *
 */
OrgConnectionService.prototype.add = function(opts) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var connectionId = uuid.v1();
    if (opts.username && opts.password) {
      var newConnection = {
        name: opts.name,
        id: connectionId,
        username: opts.username,
        orgType: opts.orgType,
        loginUrl: opts.loginUrl
      };
    } else {
      var newConnection = {
        name: opts.name,
        id: connectionId,
        instanceUrl: opts.instanceUrl
      };
    }

    if (opts.username && opts.password) {
      if (self.keychainService.useSystemKeychain()) {
        self.keychainService.storePassword(connectionId, opts.password, 'password');
      } else {
        newConnection.password = opts.password;
      }
    } else {
      if (self.keychainService.useSystemKeychain()) {
        self.keychainService.storePassword(connectionId, opts.accessToken, 'accessToken');
        self.keychainService.storePassword(connectionId, opts.refreshToken, 'refreshToken');
      } else {
        newConnection.accessToken = opts.accessToken;
        newConnection.refreshToken = opts.refreshToken;
      }
    }

    if (opts.username && opts.password) {
      var orgConnectionClient = new SalesforceClient({
        username: opts.username,
        password: opts.password,
        instanceUrl: opts.instanceUrl,
        loginUrl: opts.loginUrl,
        orgType: opts.orgType
      });
    } else {
      var orgConnectionClient = new SalesforceClient({
        accessToken: opts.accessToken,
        refreshToken: opts.refreshToken,
        instanceUrl: opts.instanceUrl
      });
    }
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
 * @param {Object} opts
 * @param {String} opts.name
 * @param {String} opts.accessToken
 * @param {String} opts.refreshToken
 * @param {String} opts.username
 * @param {String} opts.password
 * @param {String} opts.instanceUrl
 * @param {String} opts.orgType
 * @param {String} opts.loginUrl
 * @return {Promise}
 */
OrgConnectionService.prototype.update = function(opts) {
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
          if (c.id === opts.id) {
            if (opts.username && opts.password) {
              c.name = opts.name;
              c.username = opts.username;
              c.orgType = opts.orgType.toLowerCase();
              c.loginUrl = opts.loginUrl;
              if (self.keychainService.useSystemKeychain()) {
                self.keychainService.replacePassword(c.id, opts.password, 'password');
              } else {
                c.password = opts.password;
              }
            } else {
              c.name = opts.name;
              c.instanceUrl = opts.instanceUrl;
              if (self.keychainService.useSystemKeychain()) {
                self.keychainService.replacePassword(c.id, opts.accessToken, 'accessToken');
                self.keychainService.replacePassword(c.id, opts.refreshToken, 'refreshToken');
              } else {
                c.accessToken = opts.accessToken;
                c.refreshToken = opts.refreshToken;
              }
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