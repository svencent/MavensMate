'use strict';
var Q         = require('q');
var _         = require('lodash');
var tmp       = require('tmp');
var temp      = require('temp');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
var parseXml  = require('xml2js').parseString;
var uuid      = require('node-uuid');
var events    = require('events');
var inherits  = require('inherits');

// Q.longStackSupport = true;

/**
 * Represents an apex test execution
 * @param {Object} opts
 * @param {Array} opts.project - instance of Project
 * @param {Array} opts.tests - array of test names, either an array of paths ['/path/to/test1.cls'] or ['test1.cls']
 * @param {Array} opts.debugCategories - array of debug categories for the deployment
 */
function ApexTest(opts) {
  util.applyProperties(this, opts);
  this._initialize();
}

inherits(ApexTest, events.EventEmitter);

ApexTest.prototype._initialize = function() {
  var tests = [];
  var self = this;

  _.each(this.tests, function(t) {
    if (t.indexOf(path.sep) !== -1) {
      if (t.indexOf(self.project.path) === -1) {
        throw new Error('Referenced file is not a part of this project: '+t);
      }
    } else {
      var fullPath = path.join(self.project.path, 'src', 'classes', t);
      console.log(fullPath);
      if (fullPath.indexOf(self.project.path) === -1 || !path.existsSync(fullPath)) {
        throw new Error('Referenced file is not a part of this project: '+t);
      }
    }
    tests.push(t.indexOf(path.sep) !== -1 ? path.basename(t) : t);
  });
  this.tests = tests;
};

/**
 * Executes requested tests
 * @return {Promise} resolves with {Object}
 */
ApexTest.prototype.execute = function() {
  var deferred = Q.defer();
  var self = this;

  var localStore = self.project.localStore;
  var tests = [];
  var testClassIds = [];
  _.each(self.tests, function(test) {
    // console.log(test);
    var apexClassId = localStore[test].id;
    tests.push({
      ApexClassId: apexClassId
    });
    testClassIds.push(apexClassId);
  });

  console.log('running the following tests: ');
  console.log(tests);
  var testResults;

  self.project.sfdcClient.runTests(tests)
    .then(function(results) {
      testResults = results;

      var projectClassIds = [];
      _.forOwn(self.project.localStore, function(value, key) {
        if (key.endsWith('.cls')) {
          projectClassIds.push(value.id);
        }
      });
      return self.getCoverage(projectClassIds, testClassIds);
    })
    .then(function(coverageResults) {
      var result = {};

      _.each(testResults.records, function(testResult) {
        if (!_.has(result, testResult.ApexClassId)) {
          result[testResult.ApexClassId] = {};
          result[testResult.ApexClassId].results = [testResult];
        } else {
          var currentResult = result[testResult.ApexClassId];
          currentResult.results.push(testResult);
        }
      });
     
      deferred.resolve({ testResults: result, coverageResults: coverageResults });
    })
    ['catch'](function(err) {
      console.log('error!');
      deferred.reject(new Error('Could not run tests: '+err.message));
    })
    .done();

  return deferred.promise;
};

ApexTest.prototype.getCoverage = function(classIds, testClassIds) {
  var deferred = Q.defer();
  var self = this;

  var coverageObject = 'ApexCodeCoverage';
  if (testClassIds === undefined) {
    coverageObject = 'ApexCodeCoverageAggregate';
  }

  var fields = ['NumLinesCovered', 'NumLinesUncovered', 'Coverage', 'ApexClassOrTriggerId'];
  var query = 'SELECT '+fields.join(',')+ ' FROM '+coverageObject+' WHERE ApexClassOrTriggerId IN ('+util.joinForQuery(classIds)+')';

  if (testClassIds !== undefined && testClassIds.length > 0) {
    query += ' AND ApexTestClassId IN ('+util.joinForQuery(testClassIds)+')';
  }

  self.project.sfdcClient.conn.tooling.query(query, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      self._aggregateCoverage(res)
        .then(function(res) {
          deferred.resolve(res);
        })
        ['catch'](function(err) {
          deferred.reject(new Error('Could not get coverage: '+err.message));
        })
        .done();
    }
  });

  return deferred.promise;
};

/** 
 * Transforms a CodeCoverage result into a dictionary of aggregate coverage results, keyed by the class name
 * @return {Promise}
 */
ApexTest.prototype._aggregateCoverage = function(coverageResults) {
  var deferred = Q.defer();
  // var self = this; 

  var result = {}; // { "MyClass.cls" : { "coveredLines" : 5, "uncoveredLines" : 10 } } 
  _.each(coverageResults.records, function(coverageResult) {
    
    // console.log('coverage result : -->');
    // console.log(coverageResult);

    if (!_.has(result, coverageResult.ApexClassOrTriggerId)) {
      result[coverageResult.ApexClassOrTriggerId] = {};
      result[coverageResult.ApexClassOrTriggerId].coveredLines = coverageResult.Coverage.coveredLines;
      result[coverageResult.ApexClassOrTriggerId].uncoveredLines = coverageResult.Coverage.uncoveredLines;
    } else {
      var currentValue = result[coverageResult.ApexClassOrTriggerId];
      currentValue.coveredLines = _.union(currentValue.coveredLines, coverageResult.Coverage.coveredLines);
      currentValue.uncoveredLines = _.union(currentValue.uncoveredLines, coverageResult.Coverage.uncoveredLines);
    }
  });

  // coveredLines: [
  //   3, 4, 5
  // ]

  // uncoveredLines: [
  //   1, 2, 3
  // ]
  // 
  // => [1, 2]

  _.forOwn(result, function(coverageResult, apexClassOrTriggerId) {
    // console.log('for apexClassOrTriggerId: '+apexClassOrTriggerId);
    coverageResult.uncoveredLines = _.difference(coverageResult.uncoveredLines, coverageResult.coveredLines);
    coverageResult.totalLines = coverageResult.coveredLines.length + coverageResult.uncoveredLines.length;
    coverageResult.percentCovered = parseInt(coverageResult.coveredLines.length / coverageResult.totalLines);
  });

  deferred.resolve(result);

  // console.log(result);
  
  return deferred.promise; 
};

module.exports = ApexTest;


























