'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');
var Project         = require('../../../app/lib/project');

describe('app/project', function(){

  var sandbox;
  var server;
  var app;
  var project;
  var commandExecutorStub;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    localServer.start()
      .then(function() {
        app = serverStartResult.app;
        server = serverStartResult.server;
        sandbox.stub(Project.prototype, 'updateCredentials').resolves({});
        commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
        commandExecutorStub.resolves({ success: true });
        helper.stubSalesforceClient(sandbox);
        helper.bootstrapEnvironment();
        helper.putTestProjectInTestWorkspace('project-route-test');
        return helper.addProject('project-route-test');
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
    helper.cleanUpProject('project-route-test');
    server.close(done);
  });

  describe('/app/project/new', function() {
    it('should redirect to auth', function(done) {
      request(app)
        .get('/app/project/new')
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/project/auth/finish', function() {
    it('should redirect to edit', function(done) {
      request(app)
        .get('/app/project/auth/finish')
        .query({ pid: project.settings.id })
        .query({ state: '{ "pid": "'+project.settings.id+'" }' })
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/project/:id/auth', function() {
    it('should redirect to auth', function(done) {
      request(app)
        .get('/app/project/:id/auth')
        .query({ pid: project.settings.id })
        .query({ state: '{}' })
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/project/:id', function() {
    it('should render home/index.html', function(done) {
      request(app)
        .get('/app/project/'+project.settings.id)
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/project/:id/edit', function() {
    it('should render project/edit.html', function(done) {
      request(app)
        .get('/app/project/'+project.settings.id+'/edit')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/project/:id', function() {
    it('should add request to the store and return an id', function(done) {
      request(app)
        .post('/app/project/'+project.settings.id)
        .field('foo', 'bar')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /json/)
        .expect(function(res) {
          res.body.id = 'test-id';
        })
        .expect(200, {
          id: 'test-id',
          status: 'pending'
        })
        .end(function(err, res) {
          commandExecutorStub.calledOnce.should.equal(true);
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/project/:id/subscription', function() {
    it('should add request to the store and return an id', function(done) {
      request(app)
        .post('/app/project/'+project.settings.id+'/subscription')
        .field('foo', 'bar')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          commandExecutorStub.calledOnce.should.equal(true);
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/project/:id/index', function() {
    it('should add request to the store and return an id', function(done) {
      request(app)
        .post('/app/project/'+project.settings.id+'/index')
        .field('foo', 'bar')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /json/)
        .expect(function(res) {
          res.body.id = 'test-id';
        })
        .expect(200, {
          id: 'test-id',
          status: 'pending'
        })
        .end(function(err, res) {
          commandExecutorStub.calledOnce.should.equal(true);
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/project/:id/index', function() {
    it('should return project index', function(done) {
      request(app)
        .get('/app/project/'+project.settings.id+'/index')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          commandExecutorStub.calledOnce.should.equal(true);
          if (err) throw err;
          done();
        });
    });
  });
});


