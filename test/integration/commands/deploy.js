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
    testClient = helper.createClient('unittest');
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

  it('should require at least one deploy target', function(done) {
    var deployPayload = {
      destinations: [],
      package: { 'ApexClass': ['DeployClass']  },   
      deployOptions: {
        rollbackOnError: true,
        performRetrieve: true,
        checkOnly: true,
        ignoreWarnings: false,
        runAllTests: false
      }
    };
    testClient.executeCommand('deploy', deployPayload)
      .catch(function(err) {
        err.message.should.equal('Please specify at least one destination');
        done();
      });
  });

  it('should validate deploy to an org connection', function(done) {
    this.timeout(50000);  

    helper.createNewMetadata(testClient, 'ApexClass', 'DeployClass')
      .then(function() {
        var payload = {
          username: 'mm4@force.com',
          password: 'force',
          orgType: 'production'
        };
        return testClient.executeCommand('new-connection', payload);
      })
      .then(function() {
        return testClient.executeCommand('get-connections');
      })
      .then(function(conns) {   
        conns[0].environment.should.equal('production');
        var deployPayload = {
          destinations: [conns[0].id],
          package: { 'ApexClass': ['DeployClass']  },   
          deployOptions: {
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
        response.should.have.property('mm4@force.com');
        response['mm4@force.com'].checkOnly.should.equal(true);
        response['mm4@force.com'].done.should.equal(true);
        response['mm4@force.com'].success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
