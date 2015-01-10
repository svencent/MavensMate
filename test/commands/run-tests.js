'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate run-tests', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(4000);
    helper.unlinkEditor();
    testClient = helper.createClient('atom');
    helper.putTestProjectInTestWorkspace(testClient, 'run-tests');
    helper.setProject(testClient, 'run-tests', function(err, proj) {
      project = proj;
      done();
    });
  });

  after(function(done) {
    this.timeout(10000);
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'run-tests', 'src', 'classes', 'RunTestsApexClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete)
      .then(function() {
        return helper.cleanUpTestProject('run-tests');
      })
      .then(function() {
        done();
      });
  });

  it('should run tests', function(done) {
    
    this.timeout(40000);
      
    // create test class
    // run tests
    // delete test class

    helper.getNewMetadataPayload('ApexClass', 'RunTestsApexClass', 'UnitTestApexClass.cls')
      .then(function(payload) {
        testClient.executeCommand('new-metadata', payload, function() {
          var testPayload = {
            classes: [ 'RunTestsApexClass.cls' ]
          };
          testClient.executeCommand('run-tests', testPayload, function(err, response) {
            should.equal(err, null);
            response.should.have.property('result');
            response.result.should.have.property('testResults');
            response.result.should.have.property('coverageResults');
            response.result.testResults.should.have.property('RunTestsApexClass');
            response.result.coverageResults.should.have.property('classes');
            response.result.coverageResults.should.have.property('triggers');
            done();
          }); 
        });
      })
      .done();
  });

});