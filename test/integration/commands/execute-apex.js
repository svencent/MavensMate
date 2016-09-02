'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate execute-apex', function() {

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.bootstrapEnvironment();
    helper.unlinkEditor();
    commandExecutor = helper.getCommandExecutor();
    helper.putTestProjectInTestWorkspace('execute-apex');
    helper.addProject('execute-apex')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('execute-apex');
    done();
  });

  it('should execute anonymous apex', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'execute-apex',
        body: { body: 'String foo = \'bar\';' },
        project: project
      })
      .then(function(response) {

        response.compiled.should.equal(true);
        response.success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should attempt to execute invalid anonymous apex', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
      name: 'execute-apex',
      body: { body: 'String foo = \'bar\'' },
      project: project
    })
    .then(function(response) {
      response.compiled.should.equal(false);
      response.success.should.equal(false);
      response.compileProblem.should.equal('expecting a semi-colon, found \'<EOF>\'');
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });
});
