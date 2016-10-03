'use strict';

var _         = require('lodash');
var Promise   = require('bluebird');
var logger    = require('winston');
var conflict  = require('./conflict');

function ApexCompiler(project, documents, force) {
  this.project = project;
  this.documents = documents;
  this.force = force;
}

ApexCompiler.prototype.compile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Compiling ApexDocuments', self.documents);
    var compileResult;
    conflict.check(self.project, self.documents, self.force)
      .then(function(res) {
        if (res.hasConflict) {
          return resolve(res);
        } else {
          return self.project.sfdcClient.compileWithToolingApi(self.documents, self.project);
        }
      })
      .then(function(result) {
        logger.debug('Compile result for ApexDocuments', result);
        compileResult = result;
        return self.project.sfdcClient.getApexServerProperties(self.documents);
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

ApexCompiler.compileAll = function(project, documents, force) {
  return new Promise(function(resolve, reject) {
    var apexCompiler = new ApexCompiler(project, documents, force);
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