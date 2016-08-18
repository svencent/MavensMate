'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate update-subscription', function() {

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    helper.unlinkEditor();
    commandExecutor = helper.getCommandExecutor();
    helper.putTestProjectInTestWorkspace('update-subscription');
    helper.addProject('update-subscription')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('update-subscription')
    done();
  });

  it('should update the project subscription', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'update-subscription',
        body: { subscription: ['ApexClass'] },
        project: project
      })
      .then(function(response) {

        response.message.should.equal('Subscription updated successfully!');
        project.settings.subscription.length.should.equal(1);
        project.settings.subscription[0].should.equal('ApexClass');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
