'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate compile-project', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('compile-project');
    helper.addProject('compile-project')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('compile-project')
    done();
  });

  it('should compile the project based on package.xml', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'edit-project',
        body: { package: { 'ApexComponent' : '*' } },
        project: project
      })
      .then(function() {
        return commandExecutor.execute({
          name: 'compile-project',
          project: project
        });
      })
      .then(function(response) {

        response.success.should.equal(true);
        response.status.should.equal('Succeeded');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});
