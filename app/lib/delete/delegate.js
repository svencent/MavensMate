'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var util                = require('../util');
var documentUtil        = require('../document').util;
var ApexDeleter         = require('./apex');
var MetadataDeleter     = require('./metadata');
var LightningDeleter    = require('./lightning');
var logger              = require('winston');
var path                = require('path');

function DeleteDelegate(project, paths) {
  this.project = project;
  this.paths = paths;
  this.documents = documentUtil.getDocumentsFromFilePaths(this.project, this.paths);
}

DeleteDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var deletePromises = [];
      if (self.documents.apex.length === 1)
        deletePromises.push(ApexDeleter.deleteAll(self.project, self.documents.apex));
      if (self.documents.apex.length > 1)
        deletePromises.push(MetadataDeleter.deleteAll(self.project, self.documents.apex));
      if (self.documents.metadata.length > 0)
        deletePromises.push(MetadataDeleter.deleteAll(self.project, self.documents.metadata));
      if (self.documents.lightning.length > 0)
        deletePromises.push(LightningDeleter.deleteAll(self.project, self.documents.lightning));
      Promise.all(deletePromises)
        .then(function(results) {
          logger.debug('Delete results', results);
          util.removeEmptyDirectoriesRecursiveSync(path.join(self.project.path, 'src'));
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