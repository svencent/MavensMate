'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate update-subscription', function() {

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    helper.unlinkEditor();
    testClient = helper.createClient('unittest');
    helper.putTestProjectInTestWorkspace(testClient, 'update-subscription');
    helper.addProject(testClient, 'update-subscription')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('update-subscription')
    done();
  });

  it('should update the project subscription', function(done) {
    this.timeout(10000);

    testClient.executeCommand({
        name: 'update-subscription',
        body: { subscription: ['ApexClass'] }
      })
      .then(function(response) {

        response.message.should.equal('Subscription updated successfully!');
        project.getSubscription().length.should.equal(1);
        project.getSubscription()[0].should.equal('ApexClass');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
