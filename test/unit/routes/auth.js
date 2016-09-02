'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');

describe('app/auth', function(){

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
        helper.putTestProjectInTestWorkspace('auth-route-test');
        return helper.addProject('auth-route-test');
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
    helper.cleanUpProject('auth-route-test');
    server.close(done);
  });

  describe('/new', function() {
    it('should render auth/index.html', function(done) {
      request(app)
        .get('/app/auth/new')
        .query({ pid: project.settings.id })
        .expect('Content-Type', /html/)
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/callback', function() {
    it('should render callback.html', function(done) {
      request(app)
        .get('/app/auth/callback')
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
    it('should accept form post', function(done) {
      request(app)
        .post('/app/auth')
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

  describe('/finish', function() {
    it('should accept form post', function(done) {
      request(app)
        .post('/app/auth/finish')
        .send({ 'url': '/app/auth/callback#access_token=00Do0000000YN1J%21ARgAQKQjpKypAHVnAVyYMPRL.4q7vDvgvYbtXi1StZo0dLU1keSR8NB3_EHw2VHGF7zR2WPINPdFcpZGjxrUwQE9r.cgri9N&refresh_token=5Aep861LNDQReieQSLwDHfxLNT1_An3C5TvAfnXkNrLEghFkyS0O5wK9LGKe.Hn_Ve4Gj8L3j3.PqVjd0.Mzt15&instance_url=https%3A%2F%2Fna17.salesforce.com&id=https%3A%2F%2Flogin.salesforce.com%2Fid%2F00Do0000000YN1JEAW%2F005o0000000TB1iAAG&issued_at=1472057137410&signature=t76mpIRhV2v2GPJt2Zj40KnCRkgqiwGjBZ9cQTRoFzE%3D&state=%7B%22callback%22%3A%22%2Fapp%2Fproject%2Fauth%2Ffinish%22%7D'})
        .expect(302)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

});


