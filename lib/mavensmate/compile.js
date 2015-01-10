'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var config            = require('./config');
var LightningService  = require('./lightning');
var Deploy            = require('./deploy');

var CompileService = function(project) {
  this.project = project;
};

/**
 * Compiles metadata, will use metadata API or tooling API based on the metadata payload requested
 * @param  {Array} type Metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
CompileService.prototype.compileMetadata = function(metadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // we separate lightning from metadata here because we don't technically compile lightning components
    var lightningMetadata = [];
    var metadataToCompile = [];

    // ensures all files are actually part of this project
    _.each(metadata, function(m) {
      if (m.path.indexOf(self.project.path) === -1) {
        throw new Error('Referenced file is not a part of this project: '+m.path);
      }
      if (m.isLightningType()) {
        lightningMetadata.push(m);
      } else {
        metadataToCompile.push(m);
      }
    });

    if (lightningMetadata.length > 0 && metadataToCompile.length > 0) {
      reject(new Error('MavensMate does not currently support compiling lightning components with other types of metadata'));
      return;
    }

    if (lightningMetadata.length > 0) {
      var lightningService = new LightningService(self.project);
      lightningService.update(lightningMetadata)
        .then(function(result) {   
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    } else {
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
      if (shouldCompileWithToolingApi && canCompileWithToolingApi) {
        logger.debug('compiling via tooling api');
        self.project.sfdcClient.compileWithToolingApi(metadataToCompile, self.project)
          .then(function(result) {
            resolve(result);
          })
          .catch(function(error) {
            reject(error);
          })
          .done();
      } else {
        logger.debug('compiling via metadata api');
        var deploy = new Deploy({ project: self.project });
        deploy.compileWithMetadataApi(metadataToCompile)
          .then(function(result) {
            resolve(result);
          })
          .catch(function(error) {
            reject(error);
          })
          .done();
      }
    }

  });
};

module.exports = CompileService;