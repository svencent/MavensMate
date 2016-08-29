'use strict';

var _             = require('lodash');
var helper        = require('../test-helper');
var chai          = require('chai');
var should        = chai.should();
var ViewHelper    = require('../../app/helper');
var fs            = require('fs-extra');
var path          = require('path');

describe('mavensmate view-helper', function(){

  var project;
  var viewHelper;

  before(function(done) {
    this.timeout(120000);
    helper.putTestProjectInTestWorkspace('view-helper');
    helper.addProject('view-helper')
      .then(function(proj) {
        project = proj;
        viewHelper = new ViewHelper({ port: 5000 });
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('view-helper')
    done();
  });

  it('should getStaticResourcePath', function(done) {
    viewHelper.getStaticResourcePath().indexOf('app/static').should.be.greaterThan(0);
    done();
  });

  it('should getBaseUrl', function(done) {
    viewHelper.getBaseUrl().should.equal('http://localhost:5000');
    done();
  });

  describe('getDefaultSubscription', function(){
    it('should return the default description', function(done) {
      viewHelper.getDefaultSubscription().length.should.be.greaterThan(0);
      done();
    });
  });

  describe('getWorkspaces', function(){
    it('should return an array of workspaces', function(done) {
      viewHelper.getWorkspaces();
      done();
    });
  });

  describe('getMetadataObjects', function(){
    it('should return an array of objects', function(done) {
      viewHelper.getMetadataObjects(project).length.should.be.greaterThan(5);
      done();
    });
  });

  describe('getCoverageCssClass', function() {
    it('should return coverage classes', function(done) {
      viewHelper.getCoverageCssClass(90).should.equal('success');
      viewHelper.getCoverageCssClass(20).should.equal('error');
      viewHelper.getCoverageCssClass(50).should.equal('warning');
      done();
    });
  });

  describe('htmlize', function(){
    it('should html escape a string', function(done) {
      viewHelper.htmlize('foo&bam').should.equal('foo&amp;bam');
      viewHelper.htmlize('foo"bam').should.equal('foo&quot;bam');
      viewHelper.htmlize('foo<bam').should.equal('foo&lt;bam');
      viewHelper.htmlize('foo>bam').should.equal('foo&gt;bam');
      viewHelper.htmlize('foo \t bam').should.equal('foo&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;bam');
      viewHelper.htmlize('foo \n bam').should.equal('foo&nbsp;<br/>&nbsp;bam');
      done();
    });
  });

  describe('isFalse', function(){
    it('should return false for false, "false", and 0', function(done) {
      viewHelper.isFalse('false').should.equal(true);
      viewHelper.isFalse(false).should.equal(true);
      viewHelper.isFalse(0).should.equal(true);
      done();
    });
  });

  describe('isTrue', function(){
    it('should return true for true, "true", and 1', function(done) {
      viewHelper.isTrue('true').should.equal(true);
      viewHelper.isTrue(true).should.equal(true);
      viewHelper.isTrue(1).should.equal(true);
      done();
    });
  });


});

