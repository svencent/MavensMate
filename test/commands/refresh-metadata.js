'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate refresh-metadata', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'refresh-metadata');

  it('should refresh a list of files from the server', function(done) {

    helper.unlinkEditor();
    this.timeout(20000);      
    
    helper.setProject(testClient, 'refresh-metadata', function() {      
      helper.createNewMetadata(testClient, 'ApexClass', 'RefreshMetadataClass')
        .then(function() {
          var payload = {
            files: [ path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass.cls') ]
          };

          testClient.executeCommand('refresh-metadata', payload, function(err, response) {
            should.equal(err, null);
            response.should.have.property('result');
            response.result.should.equal('Metadata successfully refreshed');
            done();
          });
        })
        .done();
    });
    
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'refresh-metadata', 'src', 'classes', 'RefreshMetadataClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete);
    helper.cleanUpTestProject('refresh-metadata');
  });
});

