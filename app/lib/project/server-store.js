var Promise         = require('bluebird');
var path            = require('path');
var fs              = require('fs-extra-promise');
var config          = require('../../config');
var util            = require('../util');
var logger          = require('winston');
var _               = require('lodash');
var Indexer         = require('../org/index');

var ServerStore = function(project) {
  this._path = path.join(project.path, '.mavensmate', 'server.json');
};

ServerStore.prototype.initialize = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(self._path)) return resolve();
    util.getFileBody(self._path, true)
      .then(function(store) {
        self._state = store;
        resolve();
      })
      .catch(function(err) {
        if (err.message.indexOf('Unexpected end of input') > 0) {
          self._state = [];
          resolve();
        } else {
          reject(err);
        }
      });
  });
};

/**
 * Convenience method for determining whether the project has locally indexed metadata
 * @return {Boolean}
 */
ServerStore.prototype.hasIndex = function() {
  return this._state !== undefined && this._state !== [] && this._state !== {};
};

/**
 * Returns a representation of the store based on the project's package xml (move to package.js?)
 * @param  {SalesforceClient} sfdcClient
 * @param  {Object} packageXml
 * @return {Array}
 */
ServerStore.prototype.getIndexWithLocalSubscription = function(sfdcClient, packageXml) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // var indexer = new Indexer(sfdcClient, subscription);
    resolve(self._state);
  });
};

/**
 * Traverses the serverStore tree looking for an object with a property with a key value that matches the provided value
 * @param  {String} key - object key to look for "fileName"
 * @param  {String} value - object key value to find "classes/ChangePasswordController.cls"
 * @return {Object}
 */
ServerStore.prototype.find = function(key, value) {
  function f(value, items) {
    var i = 0, found;
    for (; i < items.length; i++) {
      if (items[i][key] === value) {
        return items[i];
      } else if (_.isArray(items[i].children)) {
        found = f(value, items[i].children);
        if (found) {
          return found;
        }
      }
    }
  }
  return f(value, this._state);
};

ServerStore.prototype.refreshTypes = function(sfdcClient, metadataTypes) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var indexer = new Indexer(sfdcClient, metadataTypes);
    indexer.index()
      .then(function(indexResults) {
        _.each(indexResults, function(result, i) {
          var existingEntry = self.find('id', result.id); // todo: not particularly efficient in a loop
          if (existingEntry) {
            existingEntry.children = result.children;
          } else {
            self._state.push(result);
          }
        });
        return fs.outputFile(self._path, JSON.stringify(self._state || {}, null, 4))
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
 * Creates server.json for the project
 * @param  {Project} project
 * @param  {Object} settings
 * @return {LocalStore}
 */
ServerStore.prototype.refresh = function(sfdcClient, metadataTypes) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var indexer = new Indexer(sfdcClient, metadataTypes);
    var newState;
    indexer.index()
      .then(function(index) {
        newState = index;
        return fs.outputFile(self._path, JSON.stringify(index || {}, null, 4))
      })
      .then(function() {
        self._state = newState;
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ServerStore;