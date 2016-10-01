/**
 * @file Service responsible for running tests and parsing results
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var Promise   = require('bluebird');
var _         = require('lodash');
var path      = require('path');
var util      = require('../util');
var fs        = require('fs-extra');
var logger    = require('winston');
var moment    = require('moment');
var config    = require('../../config');
var swig      = require('swig');
var docUtil   = require('../document/util');

/**
 * Represents an apex test execution
 * @param {Project} project - instance of Project
 * @param {Boolean} skipCoverage - whether to ignore coverage and only return the result of the tests
 */
function ApexTest(project, skipCoverage) {
  this.project = project;
  this.skipCoverage = skipCoverage;
  this.apexClassOrTriggerIdToName = {};
  this.testClassIds = [];
}

ApexTest.prototype.executeTestClasses = function(paths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var documents = docUtil.getDocumentsFromFilePaths(self.project, paths);
    _.each(documents.apex, function(d) {
      self.testClassIds.push(d.getLocalStoreProperties().id);
    });
    self.execute(self.testClassIds)
      .then(function(result) {
        resolve(result);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

ApexTest.prototype.executeTestMethods = function(testMethods) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.testMethods = testMethods;
    var paths = [];
    _.each(self.methods, function(m) {
      paths.push(m.path);
    })
    var documents = docUtil.getDocumentsFromFilePaths(self.project, paths);
    var testsPayload;
    _.each(documents.apex, function(d) {
      logger.debug('adding test to job', d);
      var apexClassId = d.getLocalStoreProperties().id;
      testsPayload.push({
        classId: apexClassId,
        testMethods: test.methodNames
      });
      self.testClassIds.push(apexClassId);
    });
    self.execute(testsPayload)
      .then(function(result) {
        resolve(result);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Executes requested tests
 * @return {Promise} resolves with {Object}
 */
ApexTest.prototype.execute = function(payload) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('executing tests', payload);

    var classResults;
    var methodResults;
    var projectClassIds = [];
    var projectTriggerIds = [];
    var coverageResults = {};
    var testResults = {};

    self.project.sfdcClient.runTests(payload)
      .then(function(results) {
        classResults = results.classResults;
        methodResults = results.methodResults;
        _.forOwn(self.project.localStore.getAll(), function(value, key) {
          if (util.endsWith(key, '.cls')) {
            projectClassIds.push(value.id);
            self.apexClassOrTriggerIdToName[value.id] = value.fullName;
          } else if (util.endsWith(key, '.trigger')) {
            projectTriggerIds.push(value.id);
            self.apexClassOrTriggerIdToName[value.id] = value.fullName;
          }
        });

        var logDownloadPromises = [];
        var logIdsToDownload = [];

        if (self.project.config.get('mm_download_categorized_test_logs')) {
          _.each(methodResults.records, function(r) {
            if (r.ApexLogId && logIdsToDownload.indexOf(r.ApexLogId) === -1) {
              logIdsToDownload.push(r.ApexLogId);
              logDownloadPromises.push(self._downloadLog(r.ApexClass.Name, r.ApexLogId));
            }
          });
        }
        return Promise.all(logDownloadPromises);
      })
      .then(function() {
        _.each(classResults.records, function(classResult) {
          var key = classResult.ApexClass.Name;
          testResults[key] = classResult;
          testResults[key].results = _.filter(methodResults.records, { ApexClassId : classResult.ApexClassId });
        });

        if (self.skipCoverage) {
          logger.info('skipping test coverage...');
          resolve({ testResults: testResults });
        } else {
          logger.info('getting test coverage...');
          self.getCoverage(projectClassIds, self.testClassIds)
            .then(function(classCoverageResults) {
              coverageResults.classes = classCoverageResults;
              return self.getCoverage(projectTriggerIds, self.testClassIds);
            })
            .then(function(triggerCoverageResults) {
              coverageResults.triggers = triggerCoverageResults;
              resolve({ testResults: testResults, coverageResults: coverageResults });
            })
            .catch(function(err) {
              logger.error('Failed to get coverage');
              logger.error(err);
              reject(err);
            })
            .done();
        }
      })
      .catch(function(err) {
        logger.error('Could not run tests');
        logger.error(err);
        reject(err);
      })
      .done();
  });
};

ApexTest.prototype.getResultHtml = function(result) {
  result.project = this.project;
  return swig.renderFile('views/unit_test/result.html', result);
};

ApexTest.prototype.getOrgWideCoverage = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var query = 'SELECT PercentCovered FROM ApexOrgWideCoverage';
    self.project.sfdcClient.conn.tooling.query(query, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res.records[0].PercentCovered);
      }
    });
  });
};

ApexTest.prototype.getCoverage = function(classOrTriggerIds) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var coverageObject = 'ApexCodeCoverage';
    if (!self.testClassIds) {
      coverageObject = 'ApexCodeCoverageAggregate';
    }

    var fields = ['NumLinesCovered', 'NumLinesUncovered', 'Coverage', 'ApexClassOrTriggerId'].join(',');
    var andTestClassIdQualifier;
    if (self.testClassIds && self.testClassIds.length > 0) {
      andTestClassIdQualifier = ' AND ApexTestClassId IN ('+util.joinForQuery(self.testClassIds)+')';
    }

    function queryForCoverage(classOrTriggerIdChunk) {
      return new Promise(function(rresolve, rreject) {
        var query = 'SELECT '+fields+' FROM '+coverageObject+' WHERE ApexClassOrTriggerId IN ('+util.joinForQuery(classOrTriggerIdChunk)+')';

        if (andTestClassIdQualifier) {
          query += andTestClassIdQualifier;
        }

        logger.debug('coverage query: ', query);

        self.project.sfdcClient.conn.tooling.query(query, function(err, res) {
          if (err) {
            rreject(err);
          } else {
            rresolve(res);
          }
        });
      });
    }

    // 21 = 18 char id plus single quote plus comma, e.g. 'dsfklfdsjksdf',
    // leave 6300 for AND ApexTestClassId IN statement (300 test classes run at the same time) (this is just a shot in the dark)
    // max length of an individual classOrTriggerIds chunk = 13550/21 = ~600

    var classOrTriggerIdsChunks = _.chunk(classOrTriggerIds, 250);
    var coveragePromises = [];
    _.each(classOrTriggerIdsChunks, function(chunk) {
      coveragePromises.push(queryForCoverage(chunk));
    });

    Promise.all(coveragePromises)
      .then(function(coveragePromiseResults) {
        return self._aggregateCoverage(coveragePromiseResults);
      })
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        logger.error('Could not get coverage: '+err.message);
        reject(err);
      });
  });
};

ApexTest.prototype._downloadLog = function(testName, logId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // create test name directory in debug/tests
    if (!fs.existsSync(path.join(self.project.path, 'debug', 'tests', testName))) {
      fs.mkdirpSync(path.join(self.project.path, 'debug', 'tests', testName));
    }

    var url = self.project.sfdcClient.conn.tooling._baseUrl() + '/sobjects/ApexLog/'+logId+'/Body';
    self.project.sfdcClient.conn.tooling.request(url, function(err, res) {
      if (err) {
        reject(new Error('Could not download log: '+err.message));
      } else {
        var logFileName = [moment().format('YYYY-MM-DD HH-mm-ss'), 'log'].join('.');
        var filePath = path.join(self.project.path, 'debug', 'tests', testName, logFileName);
        fs.outputFile(filePath, res, function(e) {
          if (e) {
            reject(new Error('Could not write log file: '+e.message));
          } else {
            resolve();
          }
        });
      }
    });
  });
};

/**
 * Transforms a CodeCoverage result into a dictionary of aggregate coverage results, keyed by the class name
 * @return {Promise}
 */
ApexTest.prototype._aggregateCoverage = function(coverageResultRecordSets) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var result = {}; // { "MyClass.cls" : { "coveredLines" : 5, "uncoveredLines" : 10 } }
      _.each(coverageResultRecordSets, function(coverageResultRecordSet) {
        _.each(coverageResultRecordSet.records, function(coverageResult) {

          logger.silly('coverage result : -->');
          logger.silly(coverageResult);

          var classOrTriggerName = self.apexClassOrTriggerIdToName[coverageResult.ApexClassOrTriggerId];

          logger.silly(classOrTriggerName);

          if (!_.has(result, classOrTriggerName)) {
            logger.silly('adding coverage result for ', classOrTriggerName);
            result[classOrTriggerName] = {};
            result[classOrTriggerName].coveredLines = coverageResult.Coverage.coveredLines;
            result[classOrTriggerName].uncoveredLines = coverageResult.Coverage.uncoveredLines;
            logger.silly(result[classOrTriggerName]);
          } else {
            var currentValue = result[classOrTriggerName];
            logger.silly('have coverage result for ', classOrTriggerName);
            logger.silly('adding coverage');
            currentValue.coveredLines = _.union(currentValue.coveredLines, coverageResult.Coverage.coveredLines);
            currentValue.uncoveredLines = _.union(currentValue.uncoveredLines, coverageResult.Coverage.uncoveredLines);
            logger.silly(currentValue);
          }
        });
      });

      logger.silly('coverage results: ', result);

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
        if (coverageResult.totalLines === 0) {
          coverageResult.percentCovered = 0;
        } else {
          coverageResult.percentCovered = Math.round(parseFloat(coverageResult.coveredLines.length / coverageResult.totalLines * 100));
        }
      });

      resolve(result);
    } catch(e) {
      reject(new Error('Could not aggregate coverage: '+e.message));
    }
  });
};

module.exports = ApexTest;