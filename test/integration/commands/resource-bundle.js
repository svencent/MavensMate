'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var assert      = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate resource-bundle', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'resource-bundle');
    helper.addProject(testClient, 'resource-bundle')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(15000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'src', 'staticresources', 'test_resource_bundle.resource')
    ];
    helper.cleanUpTestData(testClient, filesToDelete)
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      })
      .finally(function() {
        return helper.cleanUpTestProject('resource-bundle');
      });
  });

  it('should create a resource bundle from a local static resource file', function(done) {
    this.timeout(10000);

    fs.copySync(
      path.join(helper.baseTestDirectory(), 'fixtures', 'test_resource_bundle.zip'),
      path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test_resource_bundle.resource')
    );

    fs.copySync(
      path.join(helper.baseTestDirectory(), 'fixtures', 'test_resource_bundle.resource-meta.xml'),
      path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test_resource_bundle.resource-meta.xml')
    );

    var payload = {
      paths : [path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test_resource_bundle.resource')]
    };

    testClient.executeCommand({
        name: 'new-resource-bundle',
        body: payload
      })
      .then(function(response) {
        response.message.should.equal('Resource bundle(s) successfully created');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test_resource_bundle.resource'),  'Resource bundle directory not created');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test_resource_bundle.resource', 'css'),  'Resource bundle css directory not created');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test_resource_bundle.resource', 'js'),  'Resource bundle js directory not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test_resource_bundle.resource', 'css', 'bar.css'),  'Resource bundle css file not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'resource-bundles', 'test_resource_bundle.resource', 'js', 'foo.js'),  'Resource bundle js file not created');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should throw exception when trying to create resource bundle that already exists', function(done) {
    this.timeout(10000);

    var payload = {
      paths : [path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'src', 'staticresources', 'test_resource_bundle.resource')]
    };

    testClient.executeCommand({
        name: 'new-resource-bundle',
        body: payload
      })
      .catch(function(err) {
        err.message.should.equal('Resource bundle path already exists.');
        done();
      });
  });

  it('should deploy a resource bundle to the server', function(done) {
    this.timeout(30000);

    var payload = {
      paths :[ path.join(helper.baseTestDirectory(), 'workspace', 'resource-bundle', 'resource-bundles', 'test_resource_bundle.resource') ]
    };

    testClient.executeCommand({
        name: 'deploy-resource-bundle',
        body: payload
      })
      .then(function(response) {
        response.message.should.equal('Resource bundle successfully deployed');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'resource-bundle', 'src', 'staticresources', 'test_resource_bundle.resource'),  'Resource bundle staticresource does not exist');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});

