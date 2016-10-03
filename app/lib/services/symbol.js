/**
 * @file Responsible for indexing Apex symbol tables locally (they go in a project's config/.symbols directory)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise = require('bluebird');
var _       = require('lodash');
var logger  = require('winston');
var util    = require('../util');
var fs      = require('fs-extra');
var path    = require('path');

var SymbolService = function(project) {
  this.projectPath = project.path;;
  this.sfdcClient = project.sfdcClient;
};

/**
 * Indexes Apex class symbols for an entire project
 * @return {Promise}
 */
SymbolService.prototype.index = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._getApexClassIds()
      .then(function(classIds) {
        var symbolPromises = [];
        var classIdChunks = util.chunkArray(classIds, 10);
        logger.debug(classIdChunks);
        _.each(classIdChunks, function(classIds) {
          symbolPromises.push(self._getSymbolsForApexDocuments(classIds));
        });
        return Promise.all(symbolPromises);
      })
      .then(function(symbolPromiseResults) {
        logger.debug(self.classMap);
        var writeSymbolPromises = [];
        _.each(symbolPromiseResults, function(res) {
          _.each(res.records, function(symbolQueryResult) {
            writeSymbolPromises.push(self._writeSymbolTable(symbolQueryResult));
          });
        });
        return Promise.all(writeSymbolPromises);
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        reject(new Error('Could not index Apex Symbols: '+err.message));
      })
      .done();
  });
};

/**
 * Indexes Apex class symbols for a given class name
 * @param  {String} apexClassName - name of the apex class to be indexes
 * @return {Promise}
 */
SymbolService.prototype.indexSymbolsForApexClassDocuments = function(apexDocuments) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var apexClassIds = [];
    _.each(apexDocuments, function(d) {
      if (d.getLocalStoreProperties()) {
        apexClassIds.push(d.getLocalStoreProperties().id);
      }
    });
    self._getSymbolsForApexDocuments(apexClassIds)
      .then(function(symbolQueryResult) {
        return self._writeSymbolTable(symbolQueryResult.records[0]);
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        logger.error('Could not index Apex Symbols: '+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Writes symbol table response to the project's .symbols file
 * @param  {Object} symbolQueryResult - symbol table definition from salesforce
 * @return {Promise}
 */
SymbolService.prototype._writeSymbolTable = function(symbolQueryResult) {
  var self = this;
  return new Promise(function(resolve, reject) {
    fs.outputFile(path.join(
                    self.projectPath,
                    '.mavensmate',
                    '.symbols',
                    symbolQueryResult.Name+'.json'
                  ),
                  JSON.stringify(
                    symbolQueryResult.SymbolTable,
                    null,
                  4),
    function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Given a list of Apex class names, retrieve the symbol tables
 * @param  {Array} classNames - class names
 * @return {Promise}
 */
SymbolService.prototype._getSymbolsForApexDocuments = function(apexClassIds) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('_getSymbolsForApexDocument ids:', apexClassIds);

    var fields = ['NamespacePrefix', 'SymbolTable', 'Name'];
    var query = 'SELECT '+fields.join(',')+' FROM ApexClass WHERE ID IN ('+util.joinForQuery(apexClassIds)+')';

    self.sfdcClient.conn.tooling.query(query, function(err, res) {
      if (err) {
        reject(new Error('error retrieving symbols: '+err.message));
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Returns a list of Apex classes in the org (from the server)
 * @return {Promise}
 */
SymbolService.prototype._getApexClassIds = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.sfdcClient.list('ApexClass')
      .then(function(res) {
        var classIds = [];
        _.each(res.ApexClass, function(cls) {
          classIds.push(cls.id);
        });
        resolve(classIds);
      })
      .catch(function(err) {
        reject(new Error('Could not get class ids: '+err.message));
      })
      .done();
  });
};

module.exports = SymbolService;