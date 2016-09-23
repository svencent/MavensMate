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
 * Watches for store.json updates, updates _state accordingly
 * @return {Nothing}
 */
ServerStore.prototype._watch = function() {
  var self = this;
  fs.watchFile(self._path, function() {
    self._state = util.getFileBodySync(self._path, true);
  });
};

ServerStore.prototype.hasIndex = function() {
  return this._state !== undefined;
};

ServerStore.prototype.getIndexWithLocalSubscription = function(sfdcClient, subscription) {
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

/**
 * Creates server.json for the project
 * @param  {Project} project
 * @param  {Object} settings
 * @return {LocalStore}
 */
ServerStore.prototype.refresh = function(sfdcClient, subscription) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var indexer = new Indexer(sfdcClient, subscription);
    indexer.index()
      .then(function(index) {
        return fs.outputFile(self._path, JSON.stringify(index || {}, null, 4))
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ServerStore;