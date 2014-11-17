'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate compile-metadata', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'compile-metadata');

  it('should compile a list of files', function(done) {

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
});
