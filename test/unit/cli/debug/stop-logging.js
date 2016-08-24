'use strict';

var assert          = require('assert');
var sinon           = require('sinon');
var util            = require('../../../../app/lib/util');
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

describe('mavensmate stop-logging-cli', function(){

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

  it('should call directly', function(done) {
    program._events['stop-logging']();

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({ name: 'stop-logging' }));
    done();
  });
});