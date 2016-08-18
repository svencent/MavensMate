'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var logger      = require('winston');

describe('mavensmate run-tests', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.unlinkEditor();
    commandExecutor = helper.getCommandExecutor();
    helper.putTestProjectInTestWorkspace('run-tests');
    helper.addProject('run-tests')
      .then(function(res) {
        project = res;
        var loggingConfig = {
          'levels': {
            "Workflow": "INFO",
            "Callout": "INFO",
            "System": "DEBUG",
            "Database": "INFO",
            "ApexCode": "DEBUG",
            "ApexProfiling": "INFO",
            "Validation": "INFO",
            "Visualforce": "DEBUG"
          },
          "expiration": 480,
          "logType": "USER_DEBUG",
          "debugLevelName": "MAVENSMATE",
          /*jshint camelcase: false */
          'users': [
            project.sfdcClient.conn.userInfo.user_id
          ],
          /*jshint camelcase: true */
          'expiration': 480
        };
        fs.writeJsonSync(path.join(helper.baseTestDirectory(), 'workspace', 'run-tests', 'config', '.debug'), loggingConfig);
        return commandExecutor.execute({
          name: 'start-logging',
          project: project
        });
      })
      .then(function() {
        logger.info('started logging');
        done();
      })
      .catch(function(err) {
        logger.error('logging failed');
        done(err);
      });
  });

  after(function(done) {
    this.timeout(120000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'RunTestsApexClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'CoverMe.cls')
    ];
    helper.cleanUpTestData(project, filesToDelete)
      .then(function() {
        return commandExecutor.execute({
          name: 'stop-logging',
          project: project
        });
      })
      .then(function() {
        helper.cleanUpProject('run-tests');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('run-tests');
        done(err);
      });
  });

  it('should run tests', function(done) {

    this.timeout(120000);

    // create test class
    // run tests
    // delete test class
    var compilePayload;

    helper.getNewMetadataPayload('ApexClass', 'RunTestsApexClass', 'UnitTestApexClass.cls')
      .then(function(payload) {
        return commandExecutor.execute({
          name: 'new-metadata',
          body: payload,
          project: project
        })
      })
      .then(function() {
        return helper.getNewMetadataPayload('ApexClass', 'CoverMe', 'ApexClass.cls');
      })
      .then(function(payload) {
        return commandExecutor.execute({
          name: 'new-metadata',
          body: payload,
          project: project
        });
      })
      .then(function() {
        var coverMePath = path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'CoverMe.cls');
        fs.outputFileSync(coverMePath, 'public class CoverMe { public static Boolean doSomething() { return true; } }');

        var testClassPath = path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'RunTestsApexClass.cls');
        fs.outputFileSync(testClassPath, '@IsTest public class RunTestsApexClass { @IsTest public static void myTest() { System.assert(CoverMe.doSomething() == true); } }');

        var compilePayload = {
          paths: [ coverMePath, testClassPath ]
        };

        return commandExecutor.execute({
          name: 'compile-metadata',
          body: compilePayload,
          project: project
        });
      })
      .then(function() {
        var testPayload = {
          classes: [ 'RunTestsApexClass.cls' ]
        };
        return commandExecutor.execute({
          name: 'run-tests',
          body: testPayload,
          project: project
        });
      })
      .then(function(response) {

        response.should.have.property('testResults');
        response.should.have.property('coverageResults');
        response.testResults.should.have.property('RunTestsApexClass');
        response.testResults.RunTestsApexClass.Status.should.equal('Completed');
        response.testResults.RunTestsApexClass.results[0].Outcome.should.equal('Pass');
        response.testResults.RunTestsApexClass.results[0].MethodName.should.equal('myTest');
        response.coverageResults.should.have.property('classes');
        response.coverageResults.should.have.property('triggers');
        response.coverageResults.classes.CoverMe.coveredLines.length.should.equal(1);
        response.coverageResults.classes.CoverMe.coveredLines[0].should.equal(1);
        response.coverageResults.classes.CoverMe.percentCovered.should.equal(100);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  describe('coverage', function(){
    it('should get coverage for a specific class', function(done) {
      this.timeout(120000);
      var coverageClasses = [path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'CoverMe.cls')];
      commandExecutor.execute({
          name: 'get-coverage',
          body: { paths: coverageClasses  },
          project: project
        })
        .then(function(response) {
          response.should.have.property('CoverMe.cls');
          response['CoverMe.cls'].coveredLines.length.should.equal(1);
          response['CoverMe.cls'].coveredLines[0].should.equal(1);
          response['CoverMe.cls'].totalLines.should.equal(1);
          response['CoverMe.cls'].percentCovered.should.equal(100);
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('should get org-wide test coverage', function(done) {
      this.timeout(120000);
      commandExecutor.execute({
          name: 'get-coverage',
          body: { global: true  },
          project: project
        })
        .then(function(response) {
          response.should.be.a('number');
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });
  });
});