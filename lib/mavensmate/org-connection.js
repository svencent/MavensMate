'use strict';
var Q         = require('q');
var _         = require('lodash');
var tmp       = require('tmp');
var temp      = require('temp');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
var find      = require('findit');
var parseXml  = require('xml2js').parseString;
var uuid      = require('node-uuid');

// Q.longStackSupport = true;

/**
 * Service to get, add, update, remove org connections for a given project
 * @param {Object} project - project instance
 */
function OrgConnectionService(project) {
  this.project = project;
}

/**
 * Lists all org connections for this project
 * @return {Array} - list of connections
 */
OrgConnectionService.listAll = function() {
  var deferred = Q.defer();
  var self = this;
  fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
    if (err) {
      deferred.reject(new Error('Could not load org connections: '+err.message));
    } else {
      deferred.resolve(connections);
    }
  });
  return deferred.promise;
};

/**
 * Adds an org connection
 * @param {String} username
 * @param {String} password
 * @param {String} orgType - production, sandbox, developer
 */
OrgConnectionService.add = function(username, password, orgType) {
  var deferred = Q.defer();
  var self = this;

  var newConnectionId = uuid.v1();
  util.storePassword(newConnectionId, password);

  var newConnection = {
    username : username,
    environment: orgType.toLowerCase(),
    id: newConnectionId
  };

  if (!fs.existsSync(path.join(self.project.path, 'config', '.org_connections'))) {
    fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify([newConnection], null, 4), function(err) {
      if (err) {
        deferred.reject(new Error('Could not add org connection: '+err.message));
      } else {
        deferred.resolve();
      }
    });
  } else {
    fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
      if (err) {
        deferred.reject(new Error('Could not load org connections: '+err.message));
      } else {
        connections.push(newConnection);
        fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify(connections, null, 4), function(err) {
          if (err) {
            deferred.reject(new Error('Could not add org connection: '+err.message));
          } else {
            deferred.resolve();
          }
        });
      }
    });
  }

  return deferred.promise;
};

/** 
 * Updates an org connection by id
 * @param  {String} id
 * @param  {String} username
 * @param  {String} password
 * @param  {String} orgType
 * @return {Promise}
 */
OrgConnectionService.update = function(id, username, password, orgType) {
  var deferred = Q.defer();
  var self = this;

  fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
    if (err) {
      deferred.reject(new Error('Could not load org connections: '+err.message));
    } else {
      _.each(connections, function(c) {
        if (c.id === id) {
          c.username = username;
          c.password = password;
          c.orgType = orgType.toLowerCase();
          util.replacePassword(c.id, password);
          return false;
        }
      });
      fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify(connections, null, 4), function(err) {
        if (err) {
          deferred.reject(new Error('Could not update org connections: '+err.message));
        } else {
          deferred.resolve();
        }
      });
    }
  });

  return deferred.promise;
};

/**
 * Removes an org connection
 * @param  {String} id
 * @return {Promise}
 */
OrgConnectionService.remove = function(id) {
  var deferred = Q.defer();
  var self = this;

  fs.readJson(path.join(self.project.path, 'config', '.org_connections'), function(err, connections) {
    if (err) {
      deferred.reject(new Error('Could not load org connections: '+err.message));
    } else {
      var newConnections = [];
      _.each(connections, function(c) {
        if (c.id !== id) {
          newConnections.push(c);
        }
      });
      fs.outputFile(path.join(self.project.path, 'config', '.org_connections'), JSON.stringify(newConnections, null, 4), function(err) {
        if (err) {
          deferred.reject(new Error('Could not write org connections: '+err.message));
        } else {
          deferred.resolve();
        }
      });
    }
  });

  return deferred.promise;
};

module.exports = OrgConnectionService;