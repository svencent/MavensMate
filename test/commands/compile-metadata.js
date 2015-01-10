'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

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
    this.timeout(20000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls'),
      path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'pages', 'CompileMetadataPage.page')
    ];
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

  it('should compile an apex class via the tooling api', function(done) {
    this.timeout(20000);      

    helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataClass')
      .then(function() {
        var payload = {
          paths : helper.getProjectFiles(testClient, 'ApexClass')
        };
        testClient.executeCommand('compile-metadata', payload, function(err, response) {
          should.equal(err, null);
          response.should.have.property('result');
          response.result[0].State.should.equal('Completed');
          done();
        });
      })
      .done();
  });

  it('should compile an apex class and a visualforce page via the tooling api', function(done) {
    this.timeout(20000);      

    helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataClass')
      .then(function() {
        return helper.createNewMetadata(testClient, 'ApexPage', 'CompileMetadataPage', 'ApexPage.page');
      })
      .then(function() {
        var paths = [
          path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'pages', 'CompileMetadataPage.page'),
          path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls')
        ];
        var payload = {
          paths : paths
        };
        testClient.executeCommand('compile-metadata', payload, function(err, response) {
          console.log(response);
          console.log(err);
          should.equal(err, null);
          response.should.have.property('result');
          response.result[0].State.should.equal('Completed');
          done();
        });
      })
      .done();
  });

  // it('should compile a meta.xml file via the metadata api', function(done) {

  //   this.timeout(20000);      
    
  //   helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataClass')
  //     .then(function() {
  //       var metaFileLocation = path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls-meta.xml');
  //       var payload = {
  //         paths : [metaFileLocation]
  //       };
  //       testClient.executeCommand('compile-metadata', payload, function(err, response) {
  //         should.equal(err, null);
  //         response.should.have.property('result');
  //         response.result.success.should.equal(true);
  //         done();
  //       });
  //     })
  //     .done();
    
  // });
});
