'use strict';
var Q         = require('q');
var _         = require('lodash');
var path      = require('path');
var util      = require('./util').instance;
var events    = require('events');
var inherits  = require('inherits');
var fs        = require('fs-extra');
var logger    = require('winston');

// Q.longStackSupport = true;

/**
 * Represents an apex test execution
 * @param {Object} opts
 * @param {Array} opts.project - instance of Project
 * @param {Array} opts.tests - array of test names, either an array of paths ['/path/to/test1.cls'] or ['test1.cls']
 * @param {Array} opts.debugCategories - array of debug categories for the deployment
 */
function ApexTest(opts) {
  opts.tests = opts.tests || opts.classes || opts.files || [];
  util.applyProperties(this, opts);
  this._initialize();
}

inherits(ApexTest, events.EventEmitter);

ApexTest.prototype._initialize = function() {
  var tests = [];
  var self = this;
  self.apexClassOrTriggerIdToName = {};

  _.each(this.tests, function(t) {
    if (t.indexOf(path.sep) !== -1) {
      if (t.indexOf(self.project.path) === -1) {
        throw new Error('Referenced file is not a part of this project: '+t);
      }
    } else {
      if (t.indexOf('.') === -1) {
        t = t+'.cls';
      }
      var fullPath = path.join(self.project.path, 'src', 'classes', t);
      console.log(fullPath);
      if (fullPath.indexOf(self.project.path) === -1 || !fs.existsSync(fullPath)) {
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

  logger.debug('running the following tests: ');
  logger.debug(tests);

  var classResults;
  var methodResults;
  var projectClassIds = [];
  var projectTriggerIds = [];
  var coverageResults = {};

  self.project.sfdcClient.runTests(tests)
    .then(function(results) {
      classResults = results.classResults;
      methodResults = results.methodResults;
      _.forOwn(self.project.localStore, function(value, key) {
        if (util.endsWith(key, '.cls')) {
          projectClassIds.push(value.id);
          self.apexClassOrTriggerIdToName[value.id] = value.fullName;
        } else if (util.endsWith(key, '.trigger')) {
          projectTriggerIds.push(value.id);
          self.apexClassOrTriggerIdToName[value.id] = value.fullName;
        }
      });
      return self.getCoverage(projectClassIds, testClassIds);
    })
    .then(function(classCoverageResults) {
      coverageResults.classes = classCoverageResults;
      console.log('getting trigger coverage for ');
      console.log(projectTriggerIds);
      console.log(testClassIds);
      return self.getCoverage(projectTriggerIds, testClassIds);
    })
    .then(function(triggerCoverageResults) {
      console.log('got it: ');
      console.log(triggerCoverageResults);
      coverageResults.triggers = triggerCoverageResults;

      var result = {};
      _.each(classResults.records, function(classResult) {
        var key = classResult.ApexClass.Name;
        result[key] = classResult;
        result[key].results = _.where(methodResults.records, { ApexClassId : classResult.ApexClassId }); 
      });

      // _.each(methodResults.records, function(testResult) {
      //   if (!_.has(result, testResult.ApexClassId)) {
      //     result[testResult.ApexClassId] = {};
      //     result[testResult.ApexClassId].results = [testResult];
      //   } else {
      //     var currentResult = result[testResult.ApexClassId];
      //     currentResult.results.push(testResult);
      //   }
      // });
      deferred.resolve({ testResults: result, coverageResults: coverageResults });
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not run tests: '+err.message));
    })
    .done();

  return deferred.promise;
};

ApexTest.prototype.getCoverage = function(classOrTriggerIds, testClassIds) {
  var deferred = Q.defer();
  var self = this;

  var coverageObject = 'ApexCodeCoverage';
  if (testClassIds === undefined) {
    coverageObject = 'ApexCodeCoverageAggregate';
  }

  var fields = ['NumLinesCovered', 'NumLinesUncovered', 'Coverage', 'ApexClassOrTriggerId'];
  var query = 'SELECT '+fields.join(',')+ ' FROM '+coverageObject+' WHERE ApexClassOrTriggerId IN ('+util.joinForQuery(classOrTriggerIds)+')';

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
  var self = this; 

  try {
    var result = {}; // { "MyClass.cls" : { "coveredLines" : 5, "uncoveredLines" : 10 } } 
    _.each(coverageResults.records, function(coverageResult) {
      
      // console.log('coverage result : -->');
      // console.log(coverageResult);
      var classOrTriggerName = self.apexClassOrTriggerIdToName[coverageResult.ApexClassOrTriggerId];

      if (!_.has(result, coverageResult.ApexClassOrTriggerId)) {
        result[classOrTriggerName] = {};
        result[classOrTriggerName].coveredLines = coverageResult.Coverage.coveredLines;
        result[classOrTriggerName].uncoveredLines = coverageResult.Coverage.uncoveredLines;
      } else {
        var currentValue = result[classOrTriggerName];
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
      coverageResult.percentCovered = Math.round(parseFloat(coverageResult.coveredLines.length / coverageResult.totalLines * 100));
    });

    deferred.resolve(result);
  } catch(e) {
    deferred.reject(new Error('Could not aggregate coverage: '+e.message)); 
  }

  return deferred.promise; 
};

module.exports = ApexTest;


























