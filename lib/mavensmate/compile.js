'use strict';

var Q                 = require('q');
var _                 = require('lodash');
var logger            = require('winston');
var config            = require('./config');
var LightningService  = require('./lightning');
var Deploy            = require('./deploy');

var CompileService = function(project) {
  this.project = project;
};

CompileService.prototype.compileLightningComponents = function(metadata) {

};

/**
 * Compiles metadata, will use metadata API or tooling API based on the metadata payload requested
 * @param  {Array} type Metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
CompileService.prototype.compileMetadata = function(metadata) {
  var deferred = Q.defer();
  var self = this;

  // metadata can be passed as an array of file paths or an array of metadata objects
  if (_.isArray(metadata) && _.isString(metadata[0])) {
    metadata = self.project.getMetadata(metadata);
  }

  // we separate lightning from metadata here because we don't technically compile lightning components
  var lightningComponents = [];
  var metadataToCompile = [];

  // ensures all files are actually part of this project
  _.each(metadata, function(m) {
    if (m.getPath().indexOf(self.project.path) === -1) {
      throw new Error('Referenced file is not a part of this project: '+m.getPath());
    }
    if (m.isLightningType()) {
      lightningComponents.push(m);
    } else {
      metadataToCompile.push(m);
    }
  });

  logger.debug('compiling metadata');

  var shouldCompileWithToolingApi = config.get('mm_compile_with_tooling_api');
  var canCompileWithToolingApi = true;

  if (shouldCompileWithToolingApi) {
    _.each(metadataToCompile, function(m) {
      if (!m.isToolingType() || m.isMetaFile()) {
        canCompileWithToolingApi = false;
        return false;
      }
    });
  }

  var lightningService = new LightningService(self.project.sfdcClient);

  lightningService.update(lightningComponents)
    .then(function() {

    })

  if (shouldCompileWithToolingApi && canCompileWithToolingApi) {
    logger.debug('compiling via tooling api');
    self.project.sfdcClient.compileWithToolingApi(metadataToCompile, self.project)
      .then(function(result) {
        deferred.resolve(result);
      })
      ['catch'](function(error) {
        deferred.reject(error);
      })
      .done();
  } else {
    logger.debug('compiling via metadata api');
    var deploy = new Deploy({ project: self.project });
    deploy.compileWithMetadataApi(metadataToCompile)
      .then(function(result) {
        deferred.resolve(result);
      })
      ['catch'](function(error) {
        deferred.reject(error);
      })
      .done();
  }

  return deferred.promise;
};

module.exports = CompileService;