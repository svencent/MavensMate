'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');

describe('app/deploy', function(){

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
        commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
        commandExecutorStub.resolves({ success: true });
        helper.stubSalesforceClient(sandbox);
        helper.bootstrapEnvironment();
        helper.putTestProjectInTestWorkspace('deploy-route-test');
        return helper.addProject('deploy-route-test');
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
    helper.cleanUpProject('deploy-route-test');
    server.close(done);
  });

  describe('/app/deploy/new', function() {
    it('should render deploy/index.html', function(done) {
      request(app)
        .get('/app/deploy/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          commandExecutorStub.calledOnce.should.equal(true);
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/deploy', function() {
    it('should add request to the store and return an id', function(done) {
      request(app)
        .post('/app/deploy')
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

});


