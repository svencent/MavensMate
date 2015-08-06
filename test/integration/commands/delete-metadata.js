'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs');

chai.use(require('chai-fs'));

describe('mavensmate delete-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'delete-metadata');
    helper.addProject(testClient, 'delete-metadata')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('delete-metadata');
    done();
  });

  it('should create then delete metadata from server', function(done) {
    
    this.timeout(100000);

    helper.createNewMetadata(testClient, 'ApexClass', 'DeleteMetadataClass')
      .then(function() {
        return helper.createNewMetadata(testClient, 'ApexClass', 'DeleteMetadataClass2');
      })
      .then(function() {
        var payload = {
          paths: [ 
            path.join(testClient.getProject().path, 'src', 'classes', 'DeleteMetadataClass.cls') ,
            path.join(testClient.getProject().path, 'src', 'classes', 'DeleteMetadataClass2.cls') 
          ]
        };

        return testClient.executeCommand('delete-metadata', payload);
      })
      .then(function(response) {
        
        response.success.should.equal(true);
        response.status.should.equal('Succeeded');
        response.numberComponentErrors.should.equal(0);
        response.numberComponentsDeployed.should.equal(2);
        fs.existsSync(path.join(testClient.getProject().path, 'src', 'classes', 'DeleteMetadataClass.cls')).should.equal(false);
        fs.existsSync(path.join(testClient.getProject().path, 'src', 'classes', 'DeleteMetadataClass2.cls')).should.equal(false);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});
