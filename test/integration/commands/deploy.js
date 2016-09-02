'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var logger      = require('winston');

chai.use(require('chai-fs'));

describe('mavensmate deploy-to-server', function() {

  var project;
  var commandExecutor;
  var connections;

  before(function(done) {
    this.timeout(120000);
    helper.bootstrapEnvironment();
    helper.unlinkEditor();
    commandExecutor = helper.getCommandExecutor();
    helper.putTestProjectInTestWorkspace('deploy');
    helper.addProject('deploy')
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
    helper.cleanUpTestData(project, filesToDelete)
      .then(function() {
        helper.cleanUpProject('deploy');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('deploy');
        done(err);
      });
  });

  it('should require at least one deploy target', function(done) {
    var deployPayload = {
      targets: [],
      package: { 'ApexClass': ['DeployClass']  },
      deployOptions: {
        rollbackOnError: true,
        performRetrieve: true,
        checkOnly: true,
        ignoreWarnings: false,
        runAllTests: false
      }
    };
    commandExecutor.execute({
        name: 'deploy',
        body: deployPayload,
        project: project
      })
      .catch(function(err) {
        err.message.should.equal('Please specify at least one deployment target');
        done();
      });
  });

  it('should validate deploy to an org connection', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    var myConnectionName = 'my-connection';
    helper.createNewMetadata(project, 'ApexClass', 'DeployClass')
      .then(function() {
        var payload = {
          name: myConnectionName,
          username: creds.username,
          password: creds.password,
          orgType: creds.orgType
        };
        return commandExecutor.execute({
          name: 'new-connection',
          body: payload,
          project: project
        });
      })
      .then(function(res) {
        logger.debug('new connection result', res);
        return commandExecutor.execute({
          name: 'get-connections',
          project: project
        });
      })
      .then(function(conns) {
        connections = conns;
        logger.debug('connections result', connections);
        connections[0].orgType.should.equal(creds.orgType);
        var deployPayload = {
          targets: [connections[0].id],
          package: { 'ApexClass': ['DeployClass']  },
          deployOptions: {
            rollbackOnError: true,
            performRetrieve: true,
            checkOnly: true,
            ignoreWarnings: false,
            runAllTests: false
          }
        };
        return commandExecutor.execute({
          name: 'deploy',
          body: deployPayload,
          project: project
        });
      })
      .then(function(response) {
        response.should.have.property(connections[0].id);
        response[connections[0].id].checkOnly.should.equal(true);
        response[connections[0].id].done.should.equal(true);
        response[connections[0].id].success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
