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
        reject(err);
      });
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