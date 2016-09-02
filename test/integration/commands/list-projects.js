'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

chai.use(require('chai-fs'));

describe('mavensmate list-projects', function() {

  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.putTestProjectInTestWorkspace('list-projects-test');
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    done();
  });

  after(function(done) {
    helper.cleanUpProject('list-projects-test');
    done();
  });

  it('should return a list of project ids/paths in all workspaces', function(done) {
    commandExecutor.execute({
      name: 'list-projects'
    })
    .then(function(response) {
      response.length.should.equal(1);
      response[0].should.have.property('id');
      response[0].should.have.property('path');
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });
});

