'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var assert      = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate new-metadata', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'new-metadata');

  it('should create metadata from server', function(done) {
    
    helper.unlinkEditor();
    this.timeout(100000);

    helper.setProject(testClient, 'new-metadata', function() {
    
      helper.createNewMetadata(testClient, 'ApexClass', 'NewMetadataClass')
        .then(function(response) {          
          response.should.have.property('result');
          response.result.success.should.equal(true);
          response.result.status.should.equal('Succeeded');
          assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls'),  'Class file not created');
          assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls-meta.xml'),  'Class meta file not created');
          
          testClient.getProject()._parsePackageXml()
            .then(function(pkg) {
              // pkg.should.have.property('ApexClass');
              // pkg.should.have.property('ApexPage');
              // pkg.ApexClass.should.equal('*');
              // pkg.ApexPage.should.equal('*');
              // done();
              console.log('PACKAGE!!!');
              console.log(pkg);
              done();
            });
        })
        .done();
    });
    
    var filesToDelete = [path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls')];
    helper.cleanUpTestData(testClient, filesToDelete);
    helper.cleanUpTestProject('new-metadata');
  });

});

