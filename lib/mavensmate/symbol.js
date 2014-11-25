'use strict';

var Q       = require('q');
var _       = require('lodash');
var logger  = require('winston');
var util    = require('./util').instance;
var fs      = require('fs-extra');
var path    = require('path');

var SymbolService = function(project) {
  this.project = project;
};

SymbolService.prototype.index = function() {
  var deferred = Q.defer();
  var self = this;
  this._getApexClassNames()
    .then(function(classNames) {
      var symbolPromises = [];
      var classNameArrays = util.chunkArray(classNames, 10);
      logger.debug(classNameArrays);
      _.each(classNameArrays, function(classNames) {
        symbolPromises.push(self._getSymbolsForClassNames(classNames));
      });
      return Q.all(symbolPromises);
    })
    .then(function(symbolPromiseResults) {
      logger.debug(self.classMap);
      var writeSymbolPromises = [];
      _.each(symbolPromiseResults, function(res) {
        _.each(res.records, function(symbolQueryResult) {
          writeSymbolPromises.push(self._writeSymbolTable(symbolQueryResult));
        });
      });
      return Q.all(writeSymbolPromises);
    })
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not index Apex Symbols: '+err.message));
    })
    .done();
  return deferred.promise;
};

SymbolService.prototype.indexApexClass = function(apexClassName) {
  var deferred = Q.defer();
  var self = this;
  self._getSymbolsForClassNames([apexClassName])
    .then(function(symbolQueryResult) {
      return self._writeSymbolTable(symbolQueryResult);
    })
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not index Apex Symbols: '+err.message));
    })
    .done();
  return deferred.promise;
};

SymbolService.prototype._writeSymbolTable = function(symbolQueryResult) {
  var deferred = Q.defer();
  var self = this;
  fs.outputFile(path.join(self.project.path, 'config', '.symbols', symbolQueryResult.Name+'.json'), JSON.stringify(symbolQueryResult.SymbolTable, null, 4), function(err) {
    if (err) {
      deferred.reject(err);  
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

SymbolService.prototype._getSymbolsForClassNames = function(classNames) {
  var deferred = Q.defer();
  
  logger.debug('_getSymbolsForClassNames:');
  logger.debug(classNames);

  var fields = ['NamespacePrefix', 'SymbolTable', 'Name'];
  var query = 'SELECT '+fields.join(',')+' FROM ApexClass WHERE NAME IN ('+util.joinForQuery(classNames)+')';
  var self = this;

  self.project.sfdcClient.conn.tooling.query(query, function(err, res) {
    if (err) { 
      deferred.reject(new Error('error retrieving symbols: '+err.message));
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;  
};

SymbolService.prototype._getApexClassNames = function() {
  var deferred = Q.defer();
  this.project.sfdcClient.list('ApexClass')
    .then(function(res) {
      var classNames = [];
      _.each(res.ApexClass, function(cls) {
        classNames.push(cls.fullName);
      });
      deferred.resolve(classNames);
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not get class names: '+err.message));
    })
    .done();
  return deferred.promise;
};

module.exports = SymbolService;