'use strict';

var _         = require('lodash');
var logger    = require('winston');
var conflict  = require('./conflict');

function ApexCompiler(project, components, force) {
  this.project = project;
  this.components = components;
  this.force = force;
}

ApexCompiler.prototype.compile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Compiling ApexDocuments', self.components);
    var compileResult;
    conflict.check(self.project, self.components, self.force)
      .then(function(res) {
        if (res.hasConflict)
          return resolve(res);
        else
          return self.project.sfdcClient.compileWithToolingApi(self.components, self.project);
      })
      .then(function(result) {
        logger.debug('Compile result for ApexDocuments', result);
        compileResult = result;
        return self.project.sfdcClient.getApexServerProperties(self.components);
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

ApexCompiler.compileAll = function(project, components, force) {
  return new Promise(function(resolve, reject) {
    var apexCompiler = new ApexCompiler(project, components, force);
    apexCompiler.compile()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ApexCompiler;