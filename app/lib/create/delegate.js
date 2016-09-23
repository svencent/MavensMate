'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var documentUtil        = require('../document').util;
var createUtil          = require('./util');
var ApexCreator         = require('./apex');
// var MetadataCreator     = require('./metadata');
// var LightningCreator    = require('./lightning');
var logger              = require('winston');

function CreateDelegate(project, paths) {
  this.project = project;
  this.paths = paths;
  this.documents = documentUtil.getDocuments(this.project, this.paths);
}

/**
 * Takes an array of documents and creates them on the server
 * @return {Promise}
 */
CreateDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var createPromises = [];
      if (self.documents.apex.length > 0)
        createPromises.push(ApexCreator.createAll(self.project, self.documents.apex));
      // if (self.documents.metadata.length > 0)
      //   createPromises.push(MetadataCreator.createAll(self.project, self.documents.metadata));
      // if (self.documents.lightning.length > 0)
      //   createPromises.push(LightningCreator.createAll(self.project, self.documents.lightning));
      Promise.all(createPromises)
        .then(function(results) {
          logger.debug('Create results', results);
          resolve(_.flatten(results));
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(err) {
      logger.error('Failed to create metadata', err);
      reject(err);
    }
  });
};

module.exports = CreateDelegate;