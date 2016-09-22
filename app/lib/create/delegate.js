'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var documentUtil        = require('../document').util;
var compileUtil         = require('./util');
var ApexCreator         = require('./apex');
var MetadataCreator     = require('./metadata');
var LightningCreator    = require('./lightning');
var logger              = require('winston');

function CompileDelegate(project, paths, force) {
  this.project = project;
  this.paths = paths;
  this.force = force;
  this.documents = documentUtil.getDocuments(this.project, this.paths); // todo: move to util
}

CompileDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var compilePromises = [];
      if (self.documents.apex.length > 0)
        compilePromises.push(ApexCreator.compileAll(self.project, self.documents.apex, self.force));
      if (self.documents.metadata.length > 0)
        compilePromises.push(MetadataCreator.compileAll(self.project, self.documents.metadata, self.force));
      if (self.documents.lightning.length > 0)
        compilePromises.push(LightningCreator.compileAll(self.project, self.documents.lightning, self.force));
      Promise.all(compilePromises)
        .then(function(results) {
          logger.debug('Compile results', results);
          resolve(compileUtil.flattenResults(results));
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(err) {
      logger.error('Failed to compile metadata', err);
      reject(err);
    }
  });
};

module.exports = CompileDelegate;