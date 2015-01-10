'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var config            = require('./config');
var LightningService  = require('./lightning');
var Deploy            = require('./deploy');
var fs                = require('fs-extra');

var DeleteService = function(project) {
  this.project = project;
};

DeleteService.prototype.deleteFromLocalSystem = function(metadata) {
  _.each(metadata, function(m) {
    if (fs.existsSync(m.path)) {
      fs.removeSync(m.path);
    }
    if (m.hasMetaFile) {
      if (fs.existsSync(m.path+'-meta.xml')) {
        fs.removeSync(m.path+'-meta.xml');
      }  
    }
  });
};

/**
 * Compiles metadata, will use metadata API or tooling API based on the metadata payload requested
 * @param  {Array} type Metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
DeleteService.prototype.deleteFromServer = function(metadata) {
  // TODO: implement stash
  var self = this;

  return new Promise(function(resolve, reject) {
    logger.debug('deleting metadata from server');

    // we separate lightning from metadata here because we don't technically compile lightning components
    var lightningMetadata = [];
    var otherMetadata = [];

    // ensures all files are actually part of this project
    _.each(metadata, function(m) {
      if (m.path.indexOf(self.project.path) === -1) {
        throw new Error('Referenced file is not a part of this project: '+m.path);
      }
      if (m.isLightningType() && m.getLightningDefinitionType() !== 'BUNDLE') { // bundles can be deleted via metadata api
        lightningMetadata.push(m);
      } else {
        otherMetadata.push(m);
      }
    });

    if (lightningMetadata.length > 0 && otherMetadata.length > 0) {
      reject(new Error('MavensMate does not currently support deleting lightning components with other types of metadata'));
      return;
    }

    if (lightningMetadata.length > 0) {
      var lightningService = new LightningService(self.project);
      lightningService.deleteBundleItems(lightningMetadata)
        .then(function(result) {   
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    } else {
      var deploy = new Deploy({ project: self.project });
      deploy.stageDelete(metadata)
        .then(function(zipStream) {
          logger.debug('PROJECT PATH: '+self.project.path);
          return deploy.executeStream(zipStream);
        })
        .then(function(result) {
          logger.debug('Deletion result: '+ JSON.stringify(result));
          if (result.success && result.status === 'Succeeded') {
            _.each(metadata, function(m) {
              m.deleteFromLocalFileSystem();
            });
          }
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done(); 
    }
  });
};

module.exports = DeleteService;