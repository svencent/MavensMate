'use strict';

var helper          = require('../../../test-helper');
var assert          = require('assert');
var sinon           = require('sinon');
var util            = require('../../../../app/lib/util');
var _               = require('lodash');
var commandExecutor = require('../../../../app/lib/commands')();

describe('mavensmate get-coverage-cli', function(){

  var program;
  var commandExecutorStub;
  var getPayloadStub;

  before(function() {
    program = helper.initCli();
  });

  beforeEach(function() {
    commandExecutorStub = sinon.stub(program.commandExecutor, 'execute');
    getPayloadStub = sinon.stub(util, 'getPayload').resolves({ foo : 'bar' });
  });

  afterEach(function() {
    commandExecutorStub.restore();
    getPayloadStub.restore();
  });

  it('should accept an apex class path', function(done) {
    program._events['get-coverage'](['/path/to/something']);

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({
      name: 'get-coverage',
      body: { paths : [ '/path/to/something' ] }
    }));

    done();
  });

  it('should accept a global flag', function(done) {
    var cmd = _.find(program.commands, { _name : 'get-coverage' });
    cmd.global = true;

    program._events['get-coverage']();

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({
      name: 'get-coverage',
      body: { global : true }
    }));
    cmd.global = false;
    done();
  });
});