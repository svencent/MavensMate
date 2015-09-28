'use strict';

var sinon               = require('sinon');
var SettingsController  = require('../../../lib/mavensmate/ui/controllers/settings');
var helper              = require('../../test-helper');
var Promise             = require('bluebird');
var defaultSettings     = require('../../../lib/mavensmate/config/default');
var chai                = require('chai');
var assert              = chai.assert;
var should              = chai.should();

describe('mavensmate SettingsController', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(10000);
    testClient = helper.createClient('unittest');
    helper.putTestProjectInTestWorkspace(testClient, 'SettingsControllerTest');
    helper.addProject(testClient, 'SettingsControllerTest')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('SettingsControllerTest');
    done();
  });

  describe('rendering', function() {
    
    var config;
    var ctrl;
    var configLoadStub;

    beforeEach(function() {
      config = require('../../../lib/mavensmate/config');
      
      ctrl = new SettingsController({
        app : {
          get: function() {
            return null;
          }
        }
      });
    });

    afterEach(function() {
      configLoadStub.restore();
    });

    // it('should render settings/index.html with empty object if settings are invalid JSON', function(done) {    
    //   var mockedExpress = helper.mockExpress(project);
    //   var req = mockedExpress.req;
    //   var res = mockedExpress.res;
    //   var spy = res.render = sinon.spy();

    //   configLoadStub = sinon.stub(config, 'load', function() {
    //     return 'THIS IS NOT VALID JSON';
    //   });

    //   ctrl.index(req, res);
    //   spy.calledOnce.should.equal(true);
    //   var locals = {
    //     userSettings: {},
    //     defaultSettings: defaultSettings,
    //     title: 'Settings'
    //   };
    //   assert(spy.calledWith('settings/index.html', locals));
    //   done();
    // });

    it('should render settings/index.html with user settings', function(done) {    
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = res.render = sinon.spy();
      
      configLoadStub = sinon.stub(config, 'load', function() {
        return '{ "foo": "bar" }';
      });

      ctrl.index(req, res);
      spy.calledOnce.should.equal(true);
      var locals = {
        userSettings: '{ "foo": "bar" }',
        defaultSettings: defaultSettings,
        title: 'Settings'
      };
      assert(spy.calledWith('settings/index.html', locals));
      done();
    });
  });
});


