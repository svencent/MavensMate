var Package = require('../package');
var path = require('path');
var fs = require('fs-extra-promise');
var temp = require('temp');
var _ = require('lodash');
var logger = require('winston');
var conflict = require('./conflict');
var util = require('../util');
var Deploy = require('../deploy');

function MetadataCompiler(project, documents, force) {
  this._project = project;
  this._documents = documents;
  this._force = force
}

MetadataCompiler.prototype.compile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Compiling Metadata', self._documents);
    var compileResult;
    conflict.check(self._project, self._documents, self._force)
      .then(function(res) {
        if (res.hasConflict) return resolve(res);
        var deploy = new Deploy(self._project, self._documents, self._force);
        return deploy.execute();
      })
      .then(function(result) {
        logger.debug('Compile result', result);
        compileResult = result;
        if (compileResult.details.retrieveResult) {
          return self._project.localStore.update(compileResult.details.retrieveResult.fileProperties);
        } else {
          return Promise.resolve();
        }
      })
      .then(function() {
        resolve(compileResult);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

MetadataCompiler.compileAll = function(project, documents, force) {
  return new Promise(function(resolve, reject) {
    var metadataCompiler = new MetadataCompiler(project, documents, force);
    metadataCompiler.compile()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = MetadataCompiler;