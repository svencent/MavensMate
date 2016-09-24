'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var componentUtil       = require('../components').util;
var deleteUtil          = require('./util');
var ApexDeleter         = require('./apex');
var MetadataDeleter     = require('./metadata');
var LightningDeleter    = require('./lightning');
var logger              = require('winston');

function DeleteDelegate(project, paths) {
  this.project = project;
  this.paths = paths;
  this.components = componentUtil.getComponentsFromFilePaths(this.project, this.paths);
}

DeleteDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var deletePromises = [];
      if (self.components.apex.length > 0)
        deletePromises.push(ApexDeleter.deleteAll(self.project, self.components.apex));
      if (self.components.metadata.length > 0)
        deletePromises.push(MetadataDeleter.deleteAll(self.project, self.components.metadata));
      if (self.components.lightning.length > 0)
        deletePromises.push(LightningDeleter.deleteAll(self.project, self.components.lightning));
      Promise.all(deletePromises)
        .then(function(results) {
          logger.debug('Delete results', results);
          resolve(_.flatten(results));
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(err) {
      logger.error('Failed to delete metadata', err);
      reject(err);
    }
  });
};

module.exports = DeleteDelegate;