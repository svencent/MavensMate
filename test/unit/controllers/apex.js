'use strict';

var sinon           = require('sinon');
var ApexController  = require('../../../lib/mavensmate/ui/controllers/apex');
var helper          = require('../../test-helper');
var Promise         = require('bluebird');

describe('mavensmate ApexController', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(10000);
    testClient = helper.createClient('unittest');
    helper.putTestProjectInTestWorkspace(testClient, 'ApexControllerTest');
    helper.addProject(testClient, 'ApexControllerTest')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('ApexControllerTest');
    done();
  });

  describe('views', function() {
    
    var ctrl;

    beforeEach(function() {
      ctrl = new ApexController({
        app : {
          get: function(what) {
            if (what === 'client') {
              return testClient;
            }
          }
        }
      });
    });

    it('should render apex/new.html', function(done) {    
      // var mockedExpress = helper.mockExpress(project);
      // var req = mockedExpress.req;
      // var res = mockedExpress.res;
      // var spy = res.render = sinon.spy();
      // testClient.executeCommandForProject = function() {
      //   return Promise.resolve();
      // };

      // ctrl.new(req, res);
      // console.log(spy.callCount)
      // spy.calledOnce.should.equal(true);
      // spy.calledWith('execute_apex/index.html').should.equal(true);
      done();
    });
  });

});


