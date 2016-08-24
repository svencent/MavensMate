'use strict';

var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util');
var _               = require('lodash');
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate new-metadata-cli', function(){

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
    var cmd = _.find(program.commands, { _name : 'new-metadata' });
    cmd.ui = true;
    cmd.type = 'ApexClass';

    program._events['new-metadata']();

    commandExecutorStub.calledOnce.should.equal(true);
    assert(commandExecutorStub.calledWithMatch({
      name: 'new-metadata',
      body: { args: { ui: true, type: 'ApexClass' } }
    }));
    cmd.ui = false;
    cmd.type = undefined;
    done();
  });


  it('should accept stdin', function(done) {
    program._events['new-metadata']();

    getPayloadStub().then(function() {
      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'new-metadata',
        body: { foo : 'bar' }
      }));
      done();
    });
  });
});