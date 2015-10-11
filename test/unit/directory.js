'use strict';

var util              = require('../../lib/mavensmate/util').instance;
var fs                = require('fs-extra');
var chai              = require('chai');
var assert            = chai.assert;
var should            = chai.should();
var expect            = chai.expect;
var sinon             = require('sinon');
var path              = require('path');
var helper            = require('../test-helper');
var logger            = require('winston');

chai.use(require('chai-fs'));

describe('mavensmate empty-directory', function(){

  var testPath = path.join(helper.baseTestDirectory(), 'fixtures','test-directory-testing');
  before(function(done) {
    var testClient = helper.createClient('empty-directory');
    if (fs.existsSync(testPath)) {
      fs.removeSync(testPath);
    }
    fs.copySync(path.join(helper.baseTestDirectory(), 'fixtures','test-directory'), testPath);
    done();
  });

  after(function(done) {
    fs.removeSync(testPath);
    done();
  });

  it('should empty a directory recursively, preserving .svn and .git', function(done) {
    this.timeout(10000);
    var pagesPath = path.join(testPath, 'pages');
    var classesPath = path.join(testPath, 'classes');
    util.emptyDirectoryRecursiveSync(testPath);
    fs.existsSync(pagesPath).should.equal(true);
    fs.existsSync(classesPath).should.equal(true);
    done();
  });

});

describe('mavensmate remove-empty-directories', function(){

  var testPath = path.join(helper.baseTestDirectory(), 'fixtures','test-directory-testing2');
  before(function(done) {
    var testClient = helper.createClient('empty-directory');
    if (fs.existsSync(testPath)) {
      fs.removeSync(testPath);
    }
    fs.copySync(path.join(helper.baseTestDirectory(), 'fixtures','test-directory'), testPath);
    done();
  });

  after(function(done) {
    fs.removeSync(testPath);
    done();
  });

  it('should empty a directory recursively, preserving .svn and .git', function(done) {
    this.timeout(10000);
    var pagesPath = path.join(testPath, 'pages');
    var classesPath = path.join(testPath, 'classes');
    util.emptyDirectoryRecursiveSync(testPath);
    fs.existsSync(pagesPath).should.equal(true);
    fs.existsSync(classesPath).should.equal(true);
    util.removeEmptyDirectoriesRecursiveSync(testPath);
    fs.existsSync(pagesPath).should.equal(false);
    fs.existsSync(classesPath).should.equal(false);
    done();
  });

});

