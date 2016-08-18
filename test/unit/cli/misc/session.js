'use strict';

var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util').instance;
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate session-cli', function(){

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

  it('should accept username, password, orgType', function(done) {
    /* jshint ignore:start */
    program._events['session'](['foo', 'bar', 'bat']);
    /* jshint ignore:end */

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({
      name: 'session',
      body: { username : 'foo', password: 'bar', orgType: 'bat' }
    }));

    done();
  });

  it('should accept stdin', function(done) {
    /* jshint ignore:start */
    program._events['session']();
    /* jshint ignore:end */

    getPayloadStub().then(function() {
      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'session',
        body: { foo : 'bar' }
      }));
      done();
    });
  });
});