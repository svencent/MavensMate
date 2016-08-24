'use strict';

var child_process   = require('child_process');
var sinon           = require('sinon');
var helper          = require('../test-helper');
var logger          = require('winston');
var EditorService   = require('../../app/lib/services/editor');

describe('editor-unit', function(){

  var sandbox;
  var project;
  var commandExecutorStub;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    sandbox.stub(child_process, 'exec', function(cmd, callback) { console.log('SUTTTTBBBB'); });
    sandbox.stub(EditorService.prototype, '_isSupportedEditor').resolves(true);
    done();
  });

  afterEach(function(done) {
    sandbox.restore();
    done();
  });

  it('should initiate service', function(done) {
    var editorService = new EditorService('atom');
    editorService.supportedEditors.should.be.instanceof(Object);
    done();
  });

  // it('should launch a given ui path', function(done) {
  //   process.env.MAVENSMATE_SERVER_PORT = '56428';
  //   var editorService = new EditorService('atom');
  //   editorService.launchUI('home/index', { foo: 'bar' })
  //     .then(function(res) {
  //       done();
  //     })
  //     .catch(function(err) {
  //       done(err);
  //     });
  // });

});
