'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate index-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'index-metadata');
    helper.addProject(testClient, 'index-metadata')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('index-metadata');
    done();
  });

  it('should index metadata based on the project subscription', function(done) {
    
    this.timeout(80000);

    testClient.executeCommand('index-metadata')
      .then(function(response) {
        response.message.should.equal('Metadata successfully indexed');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should fail to index due to unknown type', function(done) {
    
    this.timeout(80000);

    testClient.executeCommand('update-subscription', { subscription: [ 'SomeBadType' ] })
      .then(function(response) {
        return testClient.executeCommand('index-metadata')
      })
      .catch(function(err) {
        should.equal(err.message, 'Unknown metadata type: SomeBadType');
        done();
      });
  });

  it('should index uncommon types', function(done) {
    
    this.timeout(80000);
    testClient.executeCommand('update-subscription', { subscription: [ 'CustomLabel', 'Letterhead', 'Queue', 'RecordType', 'SharingRules' ] })
      .then(function(result) {
        return testClient.executeCommand('index-metadata');
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
    
    this.timeout(10000);

    testClient.executeCommand('get-metadata-index')
      .then(function(response) {
        response.length.should.equal(project.getSubscription().length);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
