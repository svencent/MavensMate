'use strict';

var helper          = require('../../../test-helper');
var os              = require('os');
var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate run-apex-script-cli', function(){

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

  it('should accept a script name', function(done) {
    if (os.platform() === 'win32') {
      program._events['run-apex-script'](['C:\\path\\to\\script']);

      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'run-apex-script',
        body: { paths : [ 'C:\\path\\to\\script' ] }
      }));

      done();
    } else {
      program._events['run-apex-script'](['/path/to/script']);

      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'run-apex-script',
        body: { paths : [ '/path/to/script' ] }
      }));

      done();
    }
  });
});