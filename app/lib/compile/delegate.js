'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var componentUtil       = require('../component').util;
var compileUtil         = require('./util');
var ApexCompiler        = require('./apex');
var MetadataCompiler    = require('./metadata');
var LightningCompiler   = require('./lightning');
var logger              = require('winston');

function CompileDelegate(project, paths, force) {
  this.project = project;
  this.paths = paths;
  this.force = force;
  this.components = componentUtil.getComponentsFromFilePaths(this.project, this.paths); // todo: move to util
}

CompileDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var compilePromises = [];
      if (self.components.apex.length > 0)
        compilePromises.push(ApexCompiler.compileAll(self.project, self.components.apex, self.force));
      if (self.components.metadata.length > 0)
        compilePromises.push(MetadataCompiler.compileAll(self.project, self.components.metadata, self.force));
      if (self.components.lightning.length > 0)
        compilePromises.push(LightningCompiler.compileAll(self.project, self.components.lightning, self.force));
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