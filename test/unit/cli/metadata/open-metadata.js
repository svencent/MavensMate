'use strict';

var os              = require('os');
var assert          = require('assert');
var sinon           = require('sinon');
var sinonAsPromised = require('sinon-as-promised');
var util            = require('../../../../app/lib/util');
var _               = require('lodash');
var helper          = require('../../../test-helper');
var commandExecutor = require('../../../../app/lib/commands')();

sinonAsPromised(require('bluebird'));

describe('mavensmate open-metadata-cli', function(){

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

  it('should accept a metadata path', function(done) {
    if (os.platform() === 'win32') {
      program._events['open-metadata'](['C:\\path\\to\\something']);

      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'open-metadata',
        body: { paths : [ 'C:\\path\\to\\something' ] }
      }));

      done();
    } else {
      program._events['open-metadata'](['/path/to/something']);

      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'open-metadata',
        body: { paths : [ '/path/to/something' ] }
      }));

      done();
    }
  });

  it('should accept stdin', function(done) {
    program._events['open-metadata']();

    getPayloadStub().then(function() {
      commandExecutorStub.calledOnce.should.equal(true);
      assert(commandExecutorStub.calledWithMatch({
        name: 'open-metadata'
      }));
      done();
    });
  });
});