'use strict';

var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util').instance;
var _               = require('lodash');
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate deploy-cli', function(){

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

  it('should accept a ui flag', function(done) {
    var cmd = _.find(program.commands, { _name : 'run-tests' });
    cmd.ui = true;

    program._events['run-tests']();

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({
      name: 'run-tests',
      body: { args: { ui: true } }
    }));
    cmd.ui = false;
    done();
  });

  it('should accept stdin', function(done) {
    program._events['run-tests']();

    getPayloadStub().then(function() {
      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'run-tests',
        body: { foo : 'bar' }
      }));
      done();
    });
  });
});