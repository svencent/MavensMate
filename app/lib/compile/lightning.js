'use strict';

var _                 = require('lodash');
var logger            = require('winston');
var conflict          = require('./conflict');
var LightningService  = require('../services/lightning');

function LightningCompiler(project, documents, force) {
  this.project = project;
  this.documents = documents;
  this.force = force;
}

LightningCompiler.prototype.compile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Compiling Lightning', self.documents);

    var compileResult;
    conflict.check(self.project, self.documents, self.force)
      .then(function(res) {
        if (res.hasConflict) {
          return resolve(res);
        }
        else {
          var lightningService = new LightningService(self.project);
          return lightningService.update(self.documents)
        }
      })
      .then(function(res) {
        logger.debug('Compile result for Lightning', res);
        compileResult = res;
        return self.project.sfdcClient.getLightningServerProperties(self.documents);
      })
      .then(function(serverProperties) {
        self.project.localStore.update(serverProperties);
        resolve(compileResult);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

LightningCompiler.compileAll = function(project, documents, force) {
  return new Promise(function(resolve, reject) {
    var lightningCompiler = new LightningCompiler(project, documents, force);
    lightningCompiler.compile()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = LightningCompiler;