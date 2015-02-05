'use strict';

var helper  = require('../test-helper');
var chai    = require('chai');
var fs      = require('fs-extra');
var path    = require('path');
var Project = require('../../lib/mavensmate/project');
var config  = require('../../lib/mavensmate/config');
var assert  = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate project-unit', function(){

  describe('initiate new', function () {
    it('should select a workspace when setting is a string', function (done) {
      config.use('memory');
      config.set('mm_workspace', path.join(helper.baseTestDirectory(), 'workspace'));
      var project = new Project({
        name: 'foo'
      });
      project._initNew()
        .then(function() {
          project.workspace.should.equal(path.join(helper.baseTestDirectory(), 'workspace'));
          config.reset();
          done();
        });
    });

    it('should select a workspace when setting is an array', function (done) {
      config.use('memory');
      config.set('mm_workspace', [ path.join(helper.baseTestDirectory(), 'workspace'), path.join(helper.baseTestDirectory(), 'workspace', 'foo') ]);
      var project = new Project({
        name: 'foo'
      });
      project._initNew()
        .then(function() {
          project.workspace.should.equal(path.join(helper.baseTestDirectory(), 'workspace'));
          config.reset();
          done();
        });
    });

    it('should create the workspace when it does not exist', function (done) {
      config.use('memory');
      config.set('mm_workspace', [ path.join(helper.baseTestDirectory(), 'workspace', 'foo'), path.join(helper.baseTestDirectory(), 'workspace') ]);
      var project = new Project({
        name: 'foo'
      });
      project._initNew()
        .then(function() {
          project.workspace.should.equal(path.join(helper.baseTestDirectory(), 'workspace', 'foo'));
          assert.isDirectory(path.join(helper.baseTestDirectory(), 'workspace', 'foo'),  'Workspace not created');
          fs.removeSync(path.join(helper.baseTestDirectory(), 'workspace', 'foo'));
          config.reset();
          done();
        });
    });
  });
});
