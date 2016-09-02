'use strict';

var helper        = require('../../test-helper');
var chai          = require('chai');
var path          = require('path');
var should        = chai.should();
var fs            = require('fs-extra');
var logger        = require('winston');

chai.use(require('chai-fs'));

describe('mavensmate edit-project', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.bootstrapEnvironment();
    helper.unlinkEditor();
    commandExecutor = helper.getCommandExecutor();
    helper.putTestProjectInTestWorkspace('edit-project');
    helper.addProject('edit-project')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('edit-project')
    done();
  });

  it('should edit project contents', function(done) {
    this.timeout(120000);
    commandExecutor.execute({
      name: 'edit-project',
      body: { package: { CustomObject: 'Account' } },
      project: project
    })
    .then(function(response) {
      should.not.equal(response, null);

      var accountPath = path.join(project.path, 'src', 'objects', 'Account.object');
      fs.existsSync(accountPath).should.equal(true);

      var classPath = path.join(project.path, 'src', 'classes');
      var triggerPath = path.join(project.path, 'src', 'triggers');
      fs.existsSync(classPath).should.equal(false);
      fs.existsSync(triggerPath).should.equal(false);

      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

  it('should fail to update project creds because of invalid login', function(done) {
    this.timeout(120000);
    commandExecutor.execute({
        name: 'update-creds',
        body: { username: 'thiswontwork@foo.com', password: 'foobarbatbam', loginUrl: 'https://test.salesforce.com' },
        project: project
      })
      .catch(function(err) {
        err.message.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out.');
        done();
      });
  });

  it('should update project creds', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    logger.debug(project);
    commandExecutor.execute({
      name: 'update-creds',
      body: {
        username: creds.username,
        password: creds.password
      },
      project: project
    })
    .then(function(response) {
      response.message.should.equal('Credentials updated successfully!');
      done();
    })
    .catch(function(err) {
      done(err);
    });
  });

});
