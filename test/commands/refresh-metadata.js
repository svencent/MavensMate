'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');

chai.use(require('chai-fs'));

describe('mavensmate refresh-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(4000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'refresh-metadata');
    helper.setProject(testClient, 'refresh-metadata', function(err, proj) {
      project = proj;
      done();
    });
  });

  // after(function(done) {
  //   this.timeout(20000);
  //   var filesToDelete = [
  //     // path.join(helper.baseTestDirectory(),'workspace', 'refresh-metadata', 'src', 'classes', 'RefreshMetadataClass.cls')
  //     path.join(helper.baseTestDirectory(),'workspace', 'refresh-metadata', 'src', 'classes', 'RefreshMetadataClass2.cls'),
  //     path.join(helper.baseTestDirectory(),'workspace', 'refresh-metadata', 'src', 'classes', 'RefreshMetadataClass3.cls')
  //   ];
  //   helper.cleanUpTestData(testClient, filesToDelete)
  //     .then(function() {
  //       return helper.cleanUpTestProject('refresh-metadata');
  //     })
  //     .then(function() {
  //       done();
  //     });
  // });

  // it('should refresh a list of paths from the server', function(done) {
  //   this.timeout(20000);      
    
  //   helper.createNewMetadata(testClient, 'ApexClass', 'RefreshMetadataClass')
  //     .then(function() {
  //       var payload = {
  //         paths: [ path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass.cls') ]
  //       };

  //       testClient.executeCommand('refresh-metadata', payload, function(err, response) {
  //         should.equal(err, null);
  //         response.should.have.property('result');
  //         response.result.should.equal('Metadata successfully refreshed');
  //         path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass.cls').should.be.a.file('RefreshMetadataClass is missing');
  //         done();
  //       });
  //     })
  //     .done();
  // });

  it('should refresh a directory from the server', function(done) {
    this.timeout(20000);      
    
    helper.createNewMetadata(testClient, 'ApexClass', 'RefreshMetadataClassDirectory2')
      .then(function() {
        return helper.createNewMetadata(testClient, 'ApexClass', 'RefreshMetadataClassDirectory3');
      })
      .then(function() {
        fs.removeSync(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls'));
        fs.removeSync(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass3.cls'));
        var payload = {
          paths: [ path.join(testClient.getProject().path, 'src', 'classes') ]
        };
        setTimeout(function() {
          testClient.executeCommand('refresh-metadata', payload, function(err, response) {
            console.log(err);
            console.log(response);
            should.equal(err, null);
            response.should.have.property('result');
            response.result.should.equal('Metadata successfully refreshed');
            // path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls').should.be.a.file('RefreshMetadataClass2 is missing');
            done();
          });
        }, 10000);
        // testClient.executeCommand('refresh-metadata', payload, function(err, response) {
        //   console.log(err);
        //   console.log(response);
        //   should.equal(err, null);
        //   response.should.have.property('result');
        //   response.result.should.equal('Metadata successfully refreshed');
        //   // path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls').should.be.a.file('RefreshMetadataClass2 is missing');
        //   done();
        // });
      })
      .done();
  });
});

