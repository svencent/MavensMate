'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');

describe('app/metadata', function(){

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
        helper.putTestProjectInTestWorkspace('metadata-route-test');
        return helper.addProject('metadata-route-test');
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
    helper.cleanUpProject('metadata-route-test');
    server.close(done);
  });

  describe('app/metadata/:type/new', function() {
    this.timeout(5000);
    it('should render metadata/new.html', function(done) {
      request(app)
        .get('/app/metadata/ApexClass/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/metadata/:type/templates/:fileName', function() {
    it('should return a template', function(done) {
      request(app)
        .get('/app/metadata/ApexClass/templates/ApexClass.cls')
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('app/metadata/', function() {
    it('should create new metadata', function(done) {
      request(app)
        .post('/app/apex')
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


