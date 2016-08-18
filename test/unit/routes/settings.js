'use strict';

var request         = require('supertest');
var sinon           = require('sinon');
var helper          = require('../../test-helper');
var logger          = require('winston');
var localServer     = require('../../../app');
var config          = require('../../../app/config');
var path            = require('path');

describe('app/settings', function(){

  var sandbox;
  var server;
  var app;
  var project;
  var commandExecutorStub;
  var configSetStub;
  var configSaveStub;

  beforeEach(function(done) {
    config.set('mm_workspace', path.join(helper.baseTestDirectory(),'workspace'));
    sandbox = sinon.sandbox.create();
    var serverStartResult = localServer.start();
    app = serverStartResult.app;
    server = serverStartResult.server;
    commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
    commandExecutorStub.resolves({ success: true });
    configSetStub = sandbox.stub(config, 'set', function(foo){ logger.debug('fake config set', foo) });
    configSaveStub = sandbox.stub(config, 'save', function(foo){ logger.debug('fake config save!', foo) });
    helper.stubSalesforceClient(sandbox);
    helper.boostrapEnvironment();
    helper.putTestProjectInTestWorkspace('settings-route-test');
    helper.addProject('settings-route-test')
      .then(function(proj) {
        logger.warn(config.get('mm_workspace'))
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
    helper.cleanUpProject('settings-route-test');
    server.close(done);
  });

  describe('/settings', function() {
    it('should render settings/index.html', function(done) {
      request(app)
        .get('/app/settings')
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
    it('should add request to the store and return an id', function(done) {
      logger.debug('---=====>')
      logger.warn(config.get('mm_workspace'))
      request(app)
        .post('/app/settings')
        .query({ pid: project.settings.id })
        .send({
          settingKey: 'mm_ignore_managed_metadata',
          settingValue: true
        })
        .expect(200)
        .end(function(err, res) {
          if (err) throw err;
          done();
        });
    });
  });

});


