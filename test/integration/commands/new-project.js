'use strict';

var helper        = require('../../test-helper');
var chai          = require('chai');
var path          = require('path');
var fs            = require('fs-extra');
var assert        = chai.assert;
var should        = chai.should();
var logger        = require('winston');
var config        = require('../../../app/config');

chai.use(require('chai-fs'));

describe('mavensmate new-project', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('new-project-existing');
    helper.addProject('new-project-existing')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('new-project-existing');
    helper.cleanUpProject('new-project');
    done();
  });

  it('should require name', function(done) {
    commandExecutor.execute({
      name: 'new-project',
      body: {}
    })
    .catch(function(err) {
      err.message.should.equal('Please specify project name');
      done();
    });
  });

  it('should prevent project creation when the directory already exists', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    var payload = {
      name: 'new-project-existing',
      username: creds.username,
      password: creds.password,
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };
    commandExecutor.execute({
        name: 'new-project',
        body: payload
      })
      .catch(function(err) {
        err.message.should.equal('Directory already exists!');
        done();
      });
  });

  it('should throw an exception when saleforce creds are bad', function(done) {
    this.timeout(120000);
    var payload = {
      name: 'new-project-bad-creds',
      username: 'thiswontwork@force.com',
      password: 'thisisabadpassword',
      loginUrl: 'https://test.salesforce.com',
      workspace: path.join(helper.baseTestDirectory(),'workspace')
    };
    commandExecutor.execute({
      name: 'new-project',
      body: payload
    })
    .catch(function(err) {
      err.message.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out');
      done();
    });
  });

  describe('credential storage', function(){
    it('should use the .credentials when keychain is not enabled (right now this is the only state bc we cannot enable keychain during Travis build)', function(done) {
      config.set('mm_use_keyring', false);
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

      commandExecutor.execute({
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
        config.set('mm_use_keyring', true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
    });
  });

});
