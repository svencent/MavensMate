'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var assert      = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate resource-bundle', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'resource-bundle');

  it('should create a resource bundle', function(done) {
    
    helper.unlinkEditor();
    this.timeout(50000);

    helper.setProject(testClient, 'resource-bundle', function() {
      
      fs.copySync(
        path.join(helper.baseTestDirectory(), 'fixtures', 'test-resource-bundle.zip'), 
        path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource')
      );

      fs.copySync(
        path.join(helper.baseTestDirectory(), 'fixtures', 'test-resource-bundle.resource-meta.xml'), 
        path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource-meta.xml')
      );

      var payload = {
        files : [path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource')]
      };

      testClient.executeCommand('new-resource-bundle', payload, function(err, response) {
        console.log(err);
        console.log(response);
        should.equal(err, null);
        response.should.have.property('result');
        response.result.should.equal('Resource bundle(s) successfully created');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test-resource-bundle.resource'),  'Resource bundle directory not created');
        done();
      });
    });
  });

  it('should deploy a resource bundle', function(done) {
    
    helper.unlinkEditor();
    this.timeout(50000);

    var payload = {
      path : path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'resource-bundles', 'test-resource-bundle.resource')
    };

    testClient.executeCommand('deploy-resource-bundle', payload, function(err, response) {
      console.log(err);
      console.log(response);
      should.equal(err, null);
      response.should.have.property('result');
      response.result.should.equal('Resource bundle successfully deployed');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'src', 'staticresources', 'test-resource-bundle.resource'),  'Resource bundle statisresource does not exist');
      done();
    });
    
    helper.cleanUpTestProject('resource-bundle');
  });

});

