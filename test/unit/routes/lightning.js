'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');

describe('app/lightning', function(){

  var sandbox;
  var server;
  var app;
  var project;
  var commandExecutorStub;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    var serverStartResult = localServer.start();
    app = serverStartResult.app;
    server = serverStartResult.server;
    commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
    commandExecutorStub.resolves({ success: true });
    helper.stubSalesforceClient(sandbox);
    helper.boostrapEnvironment();
    helper.putTestProjectInTestWorkspace('lightning-route-test');
    helper.addProject('lightning-route-test')
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
    helper.cleanUpProject('lightning-route-test');
    server.close(done);
  });

  describe('/app/lightning/new', function() {
    it('should render lightning/new_app.html', function(done) {
      request(app)
        .get('/app/lightning/app/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/lightning/component/new', function() {
    it('should render lightning/new_component.html', function(done) {
      request(app)
        .get('/app/lightning/component/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/lightning/event/new', function() {
    it('should render lightning/new_event.html', function(done) {
      request(app)
        .get('/app/lightning/event/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/lightning/interface/new', function() {
    it('should render lightning/new_interface.html', function(done) {
      request(app)
        .get('/app/lightning/interface/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/app/lightning/app', function() {
    it('should create a new lighting app', function(done) {
      request(app)
        .post('/app/lightning/app')
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

   describe('/app/lightning/component', function() {
    it('should create a new lighting component', function(done) {
      request(app)
        .post('/app/lightning/component')
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

  describe('/app/lightning/event', function() {
    it('should create a new lighting event', function(done) {
      request(app)
        .post('/app/lightning/event')
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

  describe('/app/lightning/interface', function() {
    it('should create a new lighting interface', function(done) {
      request(app)
        .post('/app/lightning/interface')
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


