'use strict';

var sinon                   = require('sinon');
var ConnectionsController   = require('../../../lib/mavensmate/ui/controllers/connections');
var helper                  = require('../../test-helper');
var Promise                 = require('bluebird');

describe('mavensmate ConnectionsController', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(120000);
    testClient = helper.createClient('unittest');
    helper.putTestProjectInTestWorkspace(testClient, 'ConnectionsControllerTest');
    helper.addProject(testClient, 'ConnectionsControllerTest')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('ConnectionsControllerTest');
    done();
  });

  describe('views', function() {

    var ctrl;

    beforeEach(function() {
      ctrl = new ConnectionsController({
        app: {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should render connections/index.html', function(done) {
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = testClient.executeCommand = sinon.spy(function() {
        return Promise.resolve();
      });
      ctrl.index(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });
  });

  describe('getConnections', function() {

    var ctrl;

    beforeEach(function() {
      ctrl = new ConnectionsController({
        app : {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should call getConnections', function(done) {
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = testClient.executeCommand = sinon.spy(function() {
        return Promise.resolve();
      });

      ctrl.getConnections(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });
  });

  describe('newConnection', function() {

    var ctrl;

    beforeEach(function() {
      ctrl = new ConnectionsController({
        app : {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should call newConnection', function(done) {
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = testClient.executeCommand = sinon.spy(function() {
        return Promise.resolve();
      });

      ctrl.newConnection(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });
  });

  describe('deleteConnection', function() {

    var ctrl;

    beforeEach(function() {
      ctrl = new ConnectionsController({
        app : {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should call deleteConnection', function(done) {
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = testClient.executeCommand = sinon.spy(function() {
        return Promise.resolve();
      });

      ctrl.deleteConnection(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });
  });

});


