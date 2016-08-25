'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');
var util            = require('../../../app/lib/util');

describe('project-middleware', function(){

  var sandbox;
  var server;
  var app;
  var project;
  var commandExecutorStub;

  beforeEach(function(done) {
    logger.debug('before each')
    sandbox = sinon.sandbox.create();
    var serverStartResult = localServer.start();
    app = serverStartResult.app;
    server = serverStartResult.server;
    commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
    commandExecutorStub.resolves({ success: true });
    helper.stubSalesforceClient(sandbox);
    helper.boostrapEnvironment();
    helper.putTestProjectInTestWorkspace('project-middleware-test');
    helper.addProject('project-middleware-test')
      .then(function(proj) {
        logger.debug('whatt');
        project = proj;
        done();
      })
      .catch(function(err) {
        logger.error(err);
        done(err);
      });
  });

  afterEach(function(done) {
    sandbox.restore();
    helper.cleanUpProject('project-middleware-test');
    server.close(done);
  });

  describe('project unknown to the server', function() {

    describe('project with requiresAuthentication flag', function() {

      it('should redirect to re-auth endpoint when requesting an /app path', function(done) {
        var getProjectByIdStub = sandbox.stub(util, 'getProjectById');
        getProjectByIdStub.onFirstCall().returns(null);
        project.requiresAuthentication = true;
        getProjectByIdStub.onSecondCall().returns(project);
        request(app)
          .get('/app/home')
          .query({ pid: project.settings.id })
          .expect(302)
          .end(function(err, res) {
            res.text.should.equal('Found. Redirecting to /app/project/'+project.settings.id+'/auth?pid='+project.settings.id);
            if (err) throw err;
            done();
          });
      });

      it('should throw a 500 when running /execute', function(done) {
        var getProjectByIdStub = sandbox.stub(util, 'getProjectById');
        getProjectByIdStub.onFirstCall().returns(null);
        project.requiresAuthentication = true;
        getProjectByIdStub.onSecondCall().returns(project);
        request(app)
          .get('/execute')
          .query({ command: 'edit-project', pid: project.settings.id })
          .expect(500)
          .end(function(err, res) {
            res.text.should.equal('Could not complete the requested operation. Project requires re-authentication.');
            if (err) throw err;
            done();
          });
      });

      it('allow request if command is oauth-project', function(done) {
        sandbox.stub(util, 'getProjectById').returns(project);
        project.requiresAuthentication = true;
        logger.warn('project', project.requiresAuthentication);
        request(app)
          .get('/execute')
          .query({ command: 'oauth-project', pid: project.settings.id, ui: true })
          .expect(200)
          .end(function(err, res) {
            res.text.should.equal('{"success":true}');
            if (err) throw err;
            done();
          });
      });

    });
  });

  describe('project known to the server', function() {

    describe('valid project', function() {
      it('should return valid HTML page', function(done) {
        var getProjectByIdStub = sandbox.stub(util, 'getProjectById');
        project.requiresAuthentication = false;
        getProjectByIdStub.onFirstCall().returns(project);
        request(app)
          .get('/app/project/edit')
          .query({ pid: project.settings.id })
          .expect(200)
          .expect('Content-Type', /html/)
          .end(function(err, res) {
            if (err) throw err;
            done();
          });
      });
    });

    describe('project with requiresAuthentication flag', function() {

      it('should redirect to re-auth endpoint when requesting an /app path', function(done) {
        var getProjectByIdStub = sandbox.stub(util, 'getProjectById');
        project.requiresAuthentication = true;
        getProjectByIdStub.onFirstCall().returns(project);
        request(app)
          .get('/app/home')
          .query({ pid: project.settings.id })
          .expect(302)
          .end(function(err, res) {
            res.text.should.equal('Found. Redirecting to /app/project/'+project.settings.id+'/auth?pid='+project.settings.id);
            if (err) throw err;
            done();
          });
      });

      it('should throw a 500 when running /execute', function(done) {
        var getProjectByIdStub = sandbox.stub(util, 'getProjectById');
        project.requiresAuthentication = true;
        getProjectByIdStub.onFirstCall().returns(project);
        request(app)
          .get('/execute')
          .query({ command: 'edit-project', pid: project.settings.id })
          .expect(500)
          .end(function(err, res) {
            res.text.should.equal('Could not complete the requested operation. Project requires re-authentication.');
            if (err) throw err;
            done();
          });
      });

      it('allow request if command is oauth-project', function(done) {
        var getProjectByIdStub = sandbox.stub(util, 'getProjectById');
        project.requiresAuthentication = true;
        getProjectByIdStub.onFirstCall().returns(project);
        request(app)
          .get('/execute')
          .query({ command: 'oauth-project', pid: project.settings.id, ui: true })
          .expect(200)
          .end(function(err, res) {
            res.text.should.equal('{"success":true}');
            if (err) throw err;
            done();
          });
      });

    });
  });

});