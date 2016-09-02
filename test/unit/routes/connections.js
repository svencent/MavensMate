'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');

describe('app/connections', function(){

  var sandbox;
  var server;
  var app;
  var project;
  var commandExecutorStub;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    localServer.start()
      .then(function(serverStartResult) {
        app = serverStartResult.app;
        server = serverStartResult.server;
        commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
        commandExecutorStub.resolves({ success: true });
        helper.stubSalesforceClient(sandbox);
        helper.bootstrapEnvironment();
        helper.putTestProjectInTestWorkspace('connections-route-test');
        return helper.addProject('connections-route-test');
      })
      .then(function(proj) {
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
    helper.cleanUpProject('connections-route-test');
    server.close(done);
  });

  describe('/new', function() {
    it('should render connections/index.html', function(done) {
      request(app)
        .get('/app/connections/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/', function() {
    it('should return a list of connections', function(done) {
      request(app)
        .get('/app/connections/')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/', function() {
    it('should create a new connection', function(done) {
      request(app)
        .post('/app/connections/')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/auth', function() {
    it('should redirect to auth', function(done) {
      request(app)
        .post('/app/connections/auth')
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/finish', function() {
    it('should redirect to index', function(done) {
      request(app)
        .get('/app/connections/auth/finish')
        .query({ state: '{}' })
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

});


