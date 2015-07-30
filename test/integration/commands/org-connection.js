'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var assert      = chai.assert;
var fs          = require('fs-extra');

chai.use(require('chai-fs'));

describe('mavensmate org-connections', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'org-connections');
    helper.addProject(testClient, 'org-connections')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('org-connections');
    done();
  });

  it('should add a new org connection', function(done) {
    this.timeout(10000);      
    
    var payload = {
      username: 'mm@force.com',
      password: 'force',
      orgType: 'sandbox'
    };
    testClient.executeCommand('new-connection', payload)
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
    this.timeout(10000);      
    
    testClient.executeCommand('get-connections')
      .then(function(response) {
        response.length.should.equal(1);
        response[0].username.should.equal('mm@force.com');
        response[0].password.should.equal('force');
        response[0].environment.should.equal('developer');
        response[0].should.have.property('id');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should not add an org connection because of bad credentials', function(done) {
    this.timeout(10000);      
    
    var payload = {
      username: 'thiswontwork@force.com',
      password: 'cool!',
      orgType: 'developer'
    };
    testClient.executeCommand('new-connection', payload)
      .catch(function(err) {
        err.message.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'),  'Org Connections file not created');
        var connections = fs.readJsonSync(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'));
        connections.length.should.equal(1);
        done();
      });
    
  });

  it('should delete an org connection', function(done) {
    this.timeout(10000);      

    var connections = fs.readJsonSync(path.join(helper.baseTestDirectory(),'workspace', 'org-connections', 'config', '.org_connections'));
    
    var payload = {
      id: connections[0].id
    };
    testClient.executeCommand('delete-connection', payload)
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
