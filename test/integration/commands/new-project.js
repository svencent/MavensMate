'use strict';

var helper        = require('../../test-helper');
var chai          = require('chai');
var path          = require('path');
var fs            = require('fs-extra');
var assert        = chai.assert;
var should        = chai.should();
var logger        = require('winston');

chai.use(require('chai-fs'));

describe('mavensmate new-project', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(120000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'new-project-existing');
    helper.addProject(testClient, 'new-project-existing')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('new-project-existing');
    helper.cleanUpTestProject('new-project');
    done();
  });

  it('should require name', function(done) {
    testClient.executeCommand({
        name: 'new-project',
        body: {}
      })
      .catch(function(err) {
        err.message.should.equal('Please specify project name');
        done();
      });
  });

  it('should prompt that project directory already exists', function(done) {

    this.timeout(120000);
    var creds = helper.getTestCreds();
    var payload = {
      name: 'new-project-existing',
      username: creds.username,
      password: creds.password,
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };
    testClient.executeCommand({
        name: 'new-project',
        body: payload
      })
      .catch(function(err) {
        err.message.should.equal('Directory already exists!');
        done();
      });
  });

  it('should prompt because of bad salesforce creds', function(done) {
    this.timeout(120000);

    var payload = {
      name: 'new-project-bad-creds',
      username: 'thiswontwork@force.com',
      password: 'thisisabadpassword',
      loginUrl: 'https://test.salesforce.com',
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };
    testClient.executeCommand({
        name: 'new-project',
        body: payload
      })
      .catch(function(err) {
        err.message.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out');
        done();
      });
  });

  it('should create project in specified workspace', function(done) {

    this.timeout(120000);
    var creds = helper.getTestCreds();
    var payload = {
      name: 'new-project',
      username: creds.username,
      password: creds.password,
      workspace: path.join(helper.baseTestDirectory(),'workspace'),
      orgType: creds.orgType,
      package: {
        ApexPage: '*',
        CustomObject: ['Account']
      }
    };

    logger.debug('new-project payload', payload);

    testClient.executeCommand({
        name: 'new-project',
        body: payload
      })
      .then(function(response) {
        response.message.should.equal('Project created successfully');
        response.should.have.property('id');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project'),  'Project directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'config'),  'Project config directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'src'),  'Project src directory does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'src', 'package.xml'),  'Project package.xml does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'config', '.settings'),  'Project config/.settings does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'config', '.credentials'),  'Project config/.credentials does not exist');
        fs.existsSync(path.join(helper.baseTestDirectory(),'workspace', 'new-project', 'tmp.zip')).should.equal(false);
        return helper.addProject(testClient, 'new-project')
      })
      .then(function(response) {
        var project = testClient.getProject();
        project.settings.username.should.equal(creds.username);
        project.settings.orgType.should.equal('developer');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });



});
