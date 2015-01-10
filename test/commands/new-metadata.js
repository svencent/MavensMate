'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var assert      = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate new-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(4000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'new-metadata');
    helper.setProject(testClient, 'new-metadata', function(err, proj) {
      project = proj;
      done();
    });
  });

  after(function(done) {
    this.timeout(10000);
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete)
      .then(function() {
        return helper.cleanUpTestProject('new-metadata');
      })
      .then(function() {
        done();
      });
  });


  it('should create metadata from server', function(done) {
    
    this.timeout(100000);

    helper.createNewMetadata(testClient, 'ApexClass', 'NewMetadataClass')
      .then(function(response) {          
        response.should.have.property('result');
        response.result.success.should.equal(true);
        response.result.status.should.equal('Succeeded');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls'),  'Class file not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls-meta.xml'),  'Class meta file not created');
        
        testClient.getProject()._parsePackageXml()
          .then(function(pkg) {
            pkg.should.have.property('ApexClass');
            pkg.ApexClass.length.should.equal(1);
            // console.log('PACKAGE!!!');
            // console.log(pkg);
            done();
          });
      })
      .done();
  });

});

