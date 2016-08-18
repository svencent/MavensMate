'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var assert      = chai.assert;
var fs          = require('fs-extra');
var logger      = require('winston');

chai.use(require('chai-fs'));

describe('mavensmate org-connections', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('org-connections');
    helper.addProject('org-connections')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('org-connections');
    done();
  });

  it('should add a new org connection', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    var payload = {
      username: creds.username,
      password: creds.password,
      orgType: creds.orgType
    };
    commandExecutor.execute({
      name: 'new-connection',
      body: payload,
      project: project
    })
    .then(function(response) {
      response.message.should.equal('Org connection successfully created');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'),  'Org Connections file not created');
      var connections = fs.readJsonSync(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'));
      connections.length.should.equal(1);
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should get org connections', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    commandExecutor.execute({
      name: 'get-connections',
      project: project
    })
    .then(function(response) {
      response.length.should.equal(1);
      response[0].username.should.equal(creds.username);
      response[0].password.should.equal(creds.password);
      response[0].orgType.should.equal(creds.orgType);
      response[0].should.have.property('id');
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should not add an org connection because of bad credentials', function(done) {
    this.timeout(120000);
    var payload = {
      username: 'thiswontwork@force.com',
      password: 'cool!',
      orgType: 'sandbox'
    };
    commandExecutor.execute({
      name: 'new-connection',
      body: payload,
      project: project
    })
    .catch(function(err) {
      err.message.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'),  'Org Connections file not created');
      var connections = fs.readJsonSync(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'));
      connections.length.should.equal(1);
      done();
    });
  });

  it('should delete an org connection', function(done) {
    this.timeout(120000);
    var connections = fs.readJsonSync(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'));
    var payload = {
      id: connections[0].id
    };
    commandExecutor.execute({
      name: 'delete-connection',
      body: payload,
      project: project
    })
    .then(function(response) {
      response.message.should.equal('Successfully deleted org connection');
      connections = fs.readJsonSync(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'));
      connections.length.should.equal(0);
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

});
