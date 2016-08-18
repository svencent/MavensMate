'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate index-metadata', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('index-metadata');
    helper.addProject('index-metadata')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('index-metadata');
    done();
  });

  it('should index metadata based on the project subscription', function(done) {
    this.timeout(120000);
    commandExecutor.execute({ name: 'index-metadata', project: project })
      .then(function(response) {
        response.message.should.equal('Metadata successfully indexed');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should fail to index due to unknown type', function(done) {
    this.timeout(120000);
    commandExecutor.execute({
        name: 'update-subscription',
        body: { subscription: [ 'SomeBadType' ] },
        project: project
      })
      .then(function(response) {
        return commandExecutor.execute({ name: 'index-metadata', project: project })
      })
      .catch(function(err) {
        should.equal(err.message, 'Unknown metadata type: SomeBadType');
        done();
      });
  });

  it('should index uncommon types', function(done) {
    this.timeout(120000);
    commandExecutor.execute({
        name: 'update-subscription',
        body: { subscription: [ 'CustomLabel', 'Letterhead', 'Queue', 'RecordType', 'SharingRules' ] },
        project: project
      })
      .then(function(result) {
        return commandExecutor.execute({ name: 'index-metadata', project: project });
      })
      .then(function(response) {
        response.message.should.equal('Metadata successfully indexed');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should get metadata index from project', function(done) {
    this.timeout(120000);
    commandExecutor.execute({ name: 'get-metadata-index', project: project })
      .then(function(response) {
        response.length.should.equal(project.settings.subscription.length);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
