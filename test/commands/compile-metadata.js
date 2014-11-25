'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate compile-metadata', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'compile-metadata');

  it('should compile an apex class via the tooling api', function(done) {

    helper.unlinkEditor();
    this.timeout(20000);      
    
    helper.setProject(testClient, 'compile-metadata', function() {      
      helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataClass')
        .then(function() {
          var payload = {
            files : helper.getProjectFiles(testClient, 'ApexClass')
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
    
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete);
    helper.cleanUpTestProject('compile-metadata');
  });

  it('should compile a meta.xml file via the metadata api', function(done) {

    helper.unlinkEditor();
    this.timeout(20000);      
    
    helper.setProject(testClient, 'compile-metadata', function() {      
      helper.createNewMetadata(testClient, 'ApexClass', 'CompileMetadataClass')
        .then(function() {
          var metaFileLocation = path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls-meta.xml');
          var payload = {
            files : [metaFileLocation]
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
    
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete);
    helper.cleanUpTestProject('compile-metadata');
  });
});
