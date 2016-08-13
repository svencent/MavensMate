'use strict';

var sinon             = require('sinon');
var DeployController  = require('../../../lib/mavensmate/ui/controllers/deploy');
var helper            = require('../../test-helper');
var Promise           = require('bluebird');

describe('mavensmate DeployController', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(120000);
    testClient = helper.createClient('unittest');
    helper.putTestProjectInTestWorkspace(testClient, 'DeployControllerTest');
    helper.addProject(testClient, 'DeployControllerTest')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('DeployControllerTest');
    done();
  });

  describe('views', function() {

    var ctrl;

    beforeEach(function() {
      ctrl = new DeployController({
        app: {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should render deploy/new.html', function(done) {
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = testClient.executeCommand = sinon.spy(function() {
        return Promise.resolve();
      });
      ctrl.new(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });
  });

  describe('execute', function() {

    var ctrl;

    beforeEach(function() {
      ctrl = new DeployController({
        app : {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should call execute', function(done) {
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = testClient.executeCommand = sinon.spy(function() {
        return Promise.resolve();
      });
      ctrl.execute(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });
  });
});


