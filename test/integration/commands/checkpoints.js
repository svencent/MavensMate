'use strict';

var helper            = require('../../test-helper');
var chai              = require('chai');
var should            = chai.should();
var path              = require('path');
var CheckpointService = require('../../../app/lib/services/checkpoint');

describe('mavensmate checkpoints', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('checkpoints');
    helper.addProject('checkpoints')
      .then(function(proj) {
        project = proj;
        return commandExecutor.execute({
          name: 'update-subscription',
          body: { subscription: ['ApexClass'] },
          project: project
        });
      })
      .then(function() {
        return commandExecutor.execute({
          name: 'index-metadata',
          project: project
        });
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
    this.timeout(120000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls')
    ];
    helper.cleanUpTestData(project, filesToDelete)
      .then(function() {
        helper.cleanUpProject('checkpoints');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('checkpoints');
        done(err);
      });
  });


  it('should add checkpoint', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'CheckpointClass')
      .then(function(response) {
        var payload = {
          path: path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls'),
          lineNumber : 1
        };
        return commandExecutor.execute({
          name: 'new-checkpoint',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        response.success.should.equal(true);
        response.id.length.should.equal(18);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should list checkpoints', function(done) {
    this.timeout(120000);
    var payload = {
      path: path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls')
    };
    commandExecutor.execute({
        name: 'list-checkpoints',
        body: payload,
        project: project
      })
      .then(function(response) {
        response.size.should.equal(1);
        response.records.length.should.equal(1);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should delete checkpoint', function(done) {
    this.timeout(120000);
    var payload = {
      path: path.join(helper.baseTestDirectory(),'workspace', 'checkpoints', 'src', 'classes', 'CheckpointClass.cls'),
      lineNumber : 1
    };
    commandExecutor.execute({
        name: 'delete-checkpoint',
        body: payload,
        project: project
      })
      .then(function(response) {
        response.success.should.equal(true);
        response.id.length.should.equal(18);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});