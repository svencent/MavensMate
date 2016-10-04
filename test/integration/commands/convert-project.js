'use strict';

var sinon         = require('sinon');
var helper        = require('../../test-helper');
var chai          = require('chai');
var path          = require('path');
var fs            = require('fs-extra');
var assert        = chai.assert;
var should        = chai.should();
var logger        = require('winston');
var config        = require('../../../app/config');

chai.use(require('chai-fs'));

describe('mavensmate convert-project', function(){

  var project;
  var commandExecutor;
  var sandbox;

  before(function(done) {
    sandbox = sinon.sandbox.create();
    helper.stubSalesforceClient(sandbox);
    helper.bootstrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    done();
  });

  after(function(done) {
    sandbox.restore();
    helper.cleanUpProject('test-non-mavensmate-project');
    helper.cleanUpProject('new-project-from-existing-directory-moved');
    done();
  });

  it('should require workspace', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    commandExecutor.execute({
      name: 'convert-project',
      body: {
        name: 'foo',
        username: creds.username,
        password: creds.password
      }
    })
    .catch(function(err) {
      err.message.should.equal('Please select a workspace for this project');
      done();
    });
  });

  it('should require origin', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    commandExecutor.execute({
      name: 'convert-project',
      body: {
        name: 'foo',
        username: creds.username,
        password: creds.password,
        workspace: 'foo/bar'
      }
    })
    .catch(function(err) {
      err.message.should.equal('Please select an origin for this project');
      done();
    });
  });

  it('should require a valid project directory', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    commandExecutor.execute({
      name: 'convert-project',
      body: {
        name: 'new-project-from-existing-directory',
        origin: path.join(helper.baseTestDirectory(), 'fixtures', 'test-non-mavensmate-project-bad'),
        username: creds.username,
        password: creds.password,
        workspace: path.join(helper.baseTestDirectory(), 'workspace')
      }
    })
    .catch(function(err) {
      err.message.should.equal('Project must have a top-level src directory');
      done();
    });
  });

  it('should create a new mavensmate project in a mavensmate workspace from a directory in a mavensmate workspace', function(done) {
    sandbox.restore();
    this.timeout(120000);
    var creds = helper.getTestCreds();
    fs.copySync(path.join(helper.baseTestDirectory(),'fixtures','test-non-mavensmate-project'), path.join(helper.baseTestDirectory(), 'workspace', 'new-project-from-existing-directory-moved'));
    var payload = {
      origin: path.join(helper.baseTestDirectory(), 'workspace', 'new-project-from-existing-directory-moved'),
      username: creds.username,
      password: creds.password,
      workspace: path.join(helper.baseTestDirectory(), 'workspace')
    };
    commandExecutor.execute({
      name: 'convert-project',
      body: payload
    })
    .then(function(response) {
      logger.debug(response);
      response.message.should.equal('Project created successfully');
      response.should.have.property('id');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved'),  'Project directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'config'),  'Project config directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'src'),  'Project src directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'src', 'classes'),  'Classes does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'src', 'classes', 'MyClass.cls'),  'Class does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'src', 'classes', 'MyClass.cls-meta.xml'),  'Class meta does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'src', 'package.xml'),  'Project package.xml does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'config', '.settings'),  'Project config/.settings does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'config', '.credentials'),  'Project config/.credentials does not exist');
      fs.existsSync(path.join(helper.baseTestDirectory(),'workspace', 'new-project-from-existing-directory-moved', 'tmp.zip')).should.equal(false);

      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should create a new mavensmate project in a mavensmate workspace from a directory in a non-mavensmate workspace', function(done) {
    sandbox.restore();
    this.timeout(120000);
    var creds = helper.getTestCreds();
    var payload = {
      name: 'new-project-from-existing-directory',
      origin: path.join(helper.baseTestDirectory(), 'fixtures', 'test-non-mavensmate-project'),
      username: creds.username,
      password: creds.password,
      workspace: path.join(helper.baseTestDirectory(), 'workspace')
    };
    commandExecutor.execute({
      name: 'convert-project',
      body: payload
    })
    .then(function(response) {
      logger.debug(response);
      response.message.should.equal('Project created successfully');
      response.should.have.property('id');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project'),  'Project directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'config'),  'Project config directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'src'),  'Project src directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'src', 'classes'),  'Classes does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'src', 'classes', 'MyClass.cls'),  'Class does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'src', 'classes', 'MyClass.cls-meta.xml'),  'Class meta does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'src', 'package.xml'),  'Project package.xml does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'config', '.settings'),  'Project config/.settings does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'config', '.credentials'),  'Project config/.credentials does not exist');
      fs.existsSync(path.join(helper.baseTestDirectory(),'workspace', 'test-non-mavensmate-project', 'tmp.zip')).should.equal(false);

      assert.isDirectory(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project'),  'Project directory does not exist');
      fs.existsSync(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project', 'config')).should.equal(false);
      assert.isDirectory(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project', 'src'),  'Project src directory does not exist');
      assert.isDirectory(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project', 'src', 'classes'),  'Classes does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project', 'src', 'classes', 'MyClass.cls'),  'Class does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project', 'src', 'classes', 'MyClass.cls-meta.xml'),  'Class meta does not exist');
      assert.isFile(path.join(helper.baseTestDirectory(),'fixtures', 'test-non-mavensmate-project', 'src', 'package.xml'),  'Project package.xml does not exist');

      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

});
