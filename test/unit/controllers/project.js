'use strict';

var sinon               = require('sinon');
var ProjectController   = require('../../../lib/mavensmate/ui/controllers/project');
var helper              = require('../../test-helper');

describe('mavensmate ProjectController', function(){

  describe('views', function() {
    
    var ctrl;

    beforeEach(function() {
      ctrl = new ProjectController({
        app : {
          get: function() {
            return null;
          }
        }
      });
    });

    it('should render project/new.html', function(done) {    
      var mockedExpress = helper.mockExpress(project);
      var req = mockedExpress.req;
      var res = mockedExpress.res;
      var spy = res.render = sinon.spy();

      ctrl.new(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });

    it('should render project/edit.html', function(done) {    
      var req,res,spy;
      req = res = {};
      spy = res.render = sinon.spy();

      ctrl.new(req, res);
      spy.calledOnce.should.equal(true);
      done();
    });  
  });

});


