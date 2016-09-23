'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var componentUtil       = require('../component').util;
var createUtil          = require('./util');
var ApexCreator         = require('./apex');
// var MetadataCreator     = require('./metadata');
// var LightningCreator    = require('./lightning');
var logger              = require('winston');

function CreateDelegate(project, paths) {
  this.project = project;
  this.paths = paths;
  this.components = componentUtil.getComponentsFromFilePaths(this.project, this.paths);
}

/**
 * Takes an array of components and creates them on the server
 * @return {Promise}
 */
CreateDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var createPromises = [];
      if (self.components.apex.length > 0)
        createPromises.push(ApexCreator.createAll(self.project, self.components.apex));
      // if (self.components.metadata.length > 0)
      //   createPromises.push(MetadataCreator.createAll(self.project, self.components.metadata));
      // if (self.components.lightning.length > 0)
      //   createPromises.push(LightningCreator.createAll(self.project, self.components.lightning));
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