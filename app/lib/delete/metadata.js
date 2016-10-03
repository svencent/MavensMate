'use strict';

var _             = require('lodash');
var logger        = require('winston');
var path          = require('path');
var util          = require('../util');
var Destructive   = require('../deploy/destructive');

function MetadataDeleter(project, documents) {
  this.project = project;
  this.documents = documents;
}

MetadataDeleter.prototype.delete = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Deleting Metadata', self.documents);
    var deleteResult;
    var destructive = new Destructive(self.project, self.documents);
    destructive.execute()
      .then(function(result) {
        deleteResult = result;
        logger.debug('Delete result', deleteResult);
        if (deleteResult.success) {
          return self.onSuccess(deleteResult);
        } else {
          Promise.resolve();
        }
      })
      .then(function() {
        resolve(deleteResult);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

MetadataDeleter.prototype.onSuccess = function(deleteResult) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var successes = util.ensureArrayType(deleteResult.details.componentSuccesses);
      _.each(self.documents, function(d) {
        var deleteResult = _.find(successes, function(s) {
          return s.fileName.replace(/^unpackaged\//, 'src/') === d.getRelativePath();
        });
        if (deleteResult) d.deleteFromFileSystem();
      });
      resolve();
    } catch(e) {
      reject(e);
    }
  });
};

MetadataDeleter.deleteAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var metadataDeleter = new MetadataDeleter(project, documents);
    metadataDeleter.delete()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = MetadataDeleter;