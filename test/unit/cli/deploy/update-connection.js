'use strict';

var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util').instance;
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate update-connection-cli', function(){

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

  it('should accept a connection id, username, password, and orgType', function(done) {
    program._events['update-connection'](['id', 'foo', 'bar', 'bat']);

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({
      name: 'update-connection',
      body: { id: 'id', username : 'foo', password: 'bar', orgType: 'bat' }
    }));

    done();
  });
});