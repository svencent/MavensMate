'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

chai.use(require('chai-fs'));

describe('mavensmate deploy-to-server', function() {

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    helper.unlinkEditor();
    testClient = helper.createClient('atom');
    helper.putTestProjectInTestWorkspace(testClient, 'deploy');
    helper.addProject(testClient, 'deploy')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
  
  after(function(done) {
    this.timeout(30000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'deploy', 'src', 'classes', 'DeployClass.cls')
    ];

    helper.cleanUpTestData(testClient, filesToDelete)
      .catch(function(err) {
        done(err);
      })
      .finally(function() {
        helper.cleanUpTestProject('deploy');
        done();
      });
  });

  it('should validate deploy to an org connection', function(done) {
    this.timeout(50000);  

    helper.createNewMetadata(testClient, 'ApexClass', 'DeployClass')
      .then(function() {
        var payload = {
          username: 'mm@force.com',
          password: 'force',
          orgType: 'developer'
        };
        return testClient.executeCommand('new-connection', payload);
      })
      .then(function() {
        return testClient.executeCommand('get-connections', payload);
      })
      .then(function(conns) {   
        var deployPayload = {
          destinations : conns.result,
          package : { 'ApexClass' : ['DeployClass']  },   
          deployOptions     : {
            rollbackOnError: true,
            performRetrieve: true,
            checkOnly: true,
            ignoreWarnings: false,
            runAllTests: false
          }
        };
        return testClient.executeCommand('deploy', deployPayload);
      })
      .then(function(response) {
        should.equal(err, null);
        
        response.result.should.have.property('mm@force.com');
        response.result['mm@force.com'].checkOnly.should.equal(true);
        response.result['mm@force.com'].done.should.equal(true);
        response.result['mm@force.com'].success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
