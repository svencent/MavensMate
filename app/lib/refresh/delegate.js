'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var documentUtil       = require('../document').util;
var compileUtil         = require('../util');
var ApexRefresher       = require('./apex');
var MetadataRefresher   = require('./metadata');
var LightningRefresher  = require('./lightning');
var logger              = require('winston');

function RefreshDelegate(project, paths) {
  this.project = project;
  this.paths = paths;
  this.documents = documentUtil.getDocumentsFromFilePaths(this.project, this.paths);
}

RefreshDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var refreshPromises = [];
      if (self.documents.apex.length > 0)
        refreshPromises.push(ApexRefresher.refreshAll(self.project, self.documents.apex));
      if (self.documents.metadata.length > 0)
        refreshPromises.push(MetadataRefresher.refreshAll(self.project, self.documents.metadata));
      if (self.documents.lightning.length > 0)
        refreshPromises.push(LightningRefresher.refreshAll(self.project, self.documents.lightning));
      Promise.all(refreshPromises)
        .then(function(results) {
          logger.debug('Refresh results', results);
          resolve(results);
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(err) {
      logger.error('Failed to refresh metadata', err);
      reject(err);
    }
  });
};

module.exports = RefreshDelegate;