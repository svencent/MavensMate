'use strict';

var os              = require('os');
var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util');
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate new-resource-bundle-cli', function(){

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

  it('should accept a static resource path', function(done) {
    if (os.platform() === 'win32') {
      program._events['new-resource-bundle'](['C:\\path\\to\\something']);

      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
         name: 'new-resource-bundle',
         body: { paths : [ 'C:\\path\\to\\something' ] }
       }));

      done();
    } else {
      program._events['new-resource-bundle'](['/path/to/something']);

      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'new-resource-bundle',
        body: { paths : [ '/path/to/something' ] }
      }));

      done();
    }
  });
});