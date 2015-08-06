'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate compile-project', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'compile-project');
    helper.addProject(testClient, 'compile-project')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('compile-project')
    done();
  });

  it('should compile the project based on package.xml', function(done) {
    this.timeout(40000);
    
    testClient.executeCommand('edit-project', { package: { 'ApexComponent' : '*' } })
      .then(function() {
        return testClient.executeCommand('compile-project');
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
