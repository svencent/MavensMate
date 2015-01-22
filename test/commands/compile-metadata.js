'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');

describe('mavensmate compile-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(4000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'compile-metadata');
    helper.setProject(testClient, 'compile-metadata', function(err, proj) {
      project = proj;
      done();
    });
  });

  after(function(done) {
    this.timeout(30000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingFailClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingClass.cls')
    ];

    testClient.executeCommand('edit-project', { package: { ApexClass: '*' } }, function(err, response) {
      should.equal(err, null);
      should.not.equal(response, null);
      helper.cleanUpTestData(testClient, filesToDelete)
        .then(function() {
          return helper.cleanUpTestProject('compile-metadata');
        })
        .then(function() {
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });
  });

  it('should compile an apex class successfully via the tooling api', function(done) {
    this.timeout(20000);      

    helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataToolingClass')
      .then(function() {
        var payload = {
          paths : helper.getProjectFiles(testClient, 'ApexClass')
        };
        testClient.executeCommand('compile-metadata', payload, function(err, response) {
          should.equal(err, null);
          response.should.have.property('result');
          response.result.success.should.equal(true);
          response.result.details.componentSuccesses.length.should.equal(1);
          response.result.details.componentSuccesses[0].State.should.equal('Completed');
          done();
        });
      })
      .done();
  });

  it('should unsuccessfully attempt to compile an apex class via the tooling api', function(done) {
    this.timeout(20000);      

    helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataToolingFailClass')
      .then(function() {
        var apexClassPath = path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingFailClass.cls');
        var payload = {
          paths : [ apexClassPath ]
        };

        fs.outputFileSync(apexClassPath, 'public class CompileMetadataToolingClass { this will not work }');

        testClient.executeCommand('compile-metadata', payload, function(err, response) {  
          should.equal(err, null);
          response.should.have.property('result');
          response.result.success.should.equal(false);
          response.result.details.componentErrors.length.should.equal(1);
          response.result.details.componentErrors[0].should.have.property('DeployDetails');
          response.result.details.componentErrors[0].DeployDetails.componentFailures[0].success.should.equal(false);
          response.result.details.componentErrors[0].DeployDetails.componentFailures[0].lineNumber.should.equal(1);
          response.result.details.componentErrors[0].DeployDetails.componentFailures[0].columnNumber.should.equal(-1);
          response.result.details.componentErrors[0].DeployDetails.componentFailures[0].problemType.should.equal('Error');
          response.result.details.componentErrors[0].DeployDetails.componentFailures[0].fileName.should.equal('CompileMetadataToolingFailClass');
          done();
        });
      })
      .done();
  });

  it('should compile a meta.xml file via the metadata api', function(done) {
    this.timeout(20000);      
    
    helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataClass')
      .then(function() {
        var metaFileLocation = path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls-meta.xml');
        var payload = {
          paths : [metaFileLocation]
        };
        testClient.executeCommand('compile-metadata', payload, function(err, response) {
          should.equal(err, null);
          response.should.have.property('result');
          response.result.success.should.equal(true);
          done();
        });
      })
      .done();
  });

  it('should compile an object file via the metadata api', function(done) {
    this.timeout(20000);      

    testClient.executeCommand('edit-project', { package: { CustomObject: 'Account' } }, function(err, response) {
      should.equal(err, null);
      should.not.equal(response, null);

      var accountPath = path.join(testClient.getProject().path, 'src', 'objects', 'Account.object');
      fs.existsSync(accountPath).should.equal(true);
      var payload = {
        paths : [accountPath]
      };
      testClient.executeCommand('compile-metadata', payload, function(err, response) {
        should.equal(err, null);
        response.should.have.property('result');
        response.result.success.should.equal(true);
        done();
      });
    });
  });
});