'use strict';

var helper            = require('../../test-helper');
var chai              = require('chai');
var should            = chai.should();
var path              = require('path');
var CheckpointService = require('../../../lib/mavensmate/checkpoint');

describe('mavensmate checkpoints', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(15000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'checkpoints');
    helper.addProject(testClient, 'checkpoints')
      .then(function(proj) {
        project = proj;
        return testClient.executeCommandForProject(project, 'update-subscription', { subscription: ['ApexClass'] });
      })
      .then(function() {
        return testClient.executeCommandForProject(project, 'index-metadata');
      })
      .then(function() {
        var cs = new CheckpointService(project);
        return cs.deleteCheckpointsForCurrentUser();
      })
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(15000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls')
    ];
    helper.cleanUpTestData(testClient, filesToDelete)
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      })
      .finally(function() {
        helper.cleanUpTestProject('checkpoints');
      });
  });


  it('should add checkpoint', function(done) {
    this.timeout(8000);

    helper.createNewMetadata(testClient, 'ApexClass', 'CheckpointClass')
      .then(function(response) {          
        var payload = {
          path: path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls'),
          lineNumber : 1
        };
        return testClient.executeCommandForProject(project, 'new-checkpoint', payload);
      })
      .then(function(response) {
        response.should.have.property('result');
        response.result.success.should.equal(true);
        response.result.id.length.should.equal(18);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should list checkpoints', function(done) {
    this.timeout(8000);
    var payload = {
      path: path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls')
    };
    testClient.executeCommandForProject(project, 'list-checkpoints', payload)
      .then(function(response) {
        response.should.have.property('result');
        response.result.size.should.equal(1);
        response.result.records.length.should.equal(1);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should delete checkpoint', function(done) {
    this.timeout(8000);
    var payload = {
      path: path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls'),
      lineNumber : 1
    };
    testClient.executeCommandForProject(project, 'delete-checkpoint', payload)
      .then(function(response) {
        response.should.have.property('result');
        response.result.success.should.equal(true);
        response.result.id.length.should.equal(18);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});