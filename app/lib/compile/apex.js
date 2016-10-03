'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var logger      = require('winston');
var conflict    = require('./conflict');
var ApexSymbols = require('../services/symbol');

function ApexCompiler(project, documents, force) {
  this.project = project;
  this.documents = documents;
  this.force = force;
  this.apexSymbols = new ApexSymbols(project);
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
        self._updateSymbols(); // we don't wait for this promise for performance reasons
        resolve(compileResult);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

ApexCompiler.prototype._updateSymbols = function() {
  var apexClassDocuments = _.filter(this.documents, function(d) {
    return d.getType() === 'ApexClass';
  });
  this.apexSymbols.indexSymbolsForApexClassDocuments(apexClassDocuments)
    .then(function(res) {
      logger.debug('index symbol result', res);
    })
    .catch(function(err) {
      logger.error('failed to index apex symbols', err);
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