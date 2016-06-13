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
    this.timeout(120000);
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
    this.timeout(120000);
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
    testClient.executeCommand({
        name: 'deploy',
        body: deployPayload
      })
      .catch(function(err) {
        err.message.should.equal('Please specify at least one destination');
        done();
      });
  });

  it('should validate deploy to an org connection', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    helper.createNewMetadata(testClient, 'ApexClass', 'DeployClass')
      .then(function() {
        var payload = {
          username: creds.username,
          password: creds.password,
          orgType: creds.environment
        };
        return testClient.executeCommand({
          name: 'new-connection',
          body: payload
        });
      })
      .then(function() {
        return testClient.executeCommand({
          name: 'get-connections'
        });
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
        return testClient.executeCommand({
          name: 'deploy',
          body: deployPayload
        });
      })
      .then(function(response) {
        response.should.have.property(creds.username);
        response[creds.username].checkOnly.should.equal(true);
        response[creds.username].done.should.equal(true);
        response[creds.username].success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
