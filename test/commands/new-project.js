'use strict';

var helper        = require('../test-helper');
var chai          = require('chai');
var path          = require('path');
var assert        = chai.assert;
var should        = chai.should();

chai.use(require('chai-fs'));

describe('mavensmate new-project', function(){

  helper.unlinkEditor();
  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'new-project-existing');

  it('should require username and password', function(done) {
    testClient.executeCommand('new-project', {}, function(err, response) {
      should.equal(response, undefined);
      err.should.have.property('error');
      err.error.should.equal('Please specify username, password, and project name');
      done();
    });
  });

  it('should prompt that project directory already exists', function(done) {
    var payload = {
      projectName: 'new-project-existing',
      username: 'mm@force.com',
      password: 'force',
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };
    testClient.executeCommand('new-project', payload, function(err, response) {
      should.equal(response, undefined);
      err.should.have.property('error');
      err.error.should.equal('Could not initiate new Project instance: Error: Directory already exists!');
      done();
    });

    helper.cleanUpTestProject('new-project-existing');
  });

  it('should prompt because of bad salesforce creds', function(done) {    
    this.timeout(10000);

    var payload = {
      projectName: 'new-project-bad-creds',
      username: 'thiswontwork@force.com',
      password: 'thisisabadpassword',
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };
    testClient.executeCommand('new-project', payload, function(err, response) {
      should.equal(response, undefined);
      err.should.have.property('error');
      err.error.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out');
      done();
    });
  });

  it('should create project in specified workspace', function(done) {
    
    this.timeout(50000);
    
    var payload = {
      projectName: 'new-project',
      username: 'mm@force.com',
      password: 'force',
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };

    testClient.executeCommand('new-project', payload, function(err, response) {
      should.equal(err, null);
      response.should.have.property('result');
      response.result.should.equal('Project created successfully');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project'),  'Project directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'config'),  'Project config directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'src'),  'Project src directory does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'src', 'package.xml'),  'Project package.xml does not exist');
      helper.setProject(testClient, 'new-project', function() {
        var project = testClient.getProject();
        project.settings.username.should.equal('mm@force.com');
        project.settings.password.should.equal('force');
        project.settings.environment.should.equal('developer');
        done();
      });
    });

    helper.cleanUpTestProject('new-project');

  });

});
