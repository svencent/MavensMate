'use strict';

var Promise         = require('bluebird');
var _               = require('lodash');
var fs              = require('fs-extra');
var path            = require('path');
var MetadataHelper  = require('./metadata').MetadataHelper;
var util            = require('./util');
var config          = require('../config');
var request         = require('request');
var swig            = require('swig');
var logger          = require('winston');
var TemplateService = require('./services/template');

/**
 * Represents a path in a MavensMate project
 *
 * @constructor
 * @param {Object} [opts] - Options
 * @param {String} [opts.path] - file path
 * @param {String} [opts.project] - project instance
 */

var ProjectPath = function(opts) {
  // this._project = opts.project;
  this._path = path.normalize(opts.path);
  this._basename = path.basename(this._path);
  this._extension = path.extname(this._path).replace(/./, '');
}

ProjectPath.prototype.isDirectory = function() {
  return fs.statSync(this._path).isDirectory();
};

ProjectPath.prototype.isFile = function() {
  return fs.statSync(this._path).isFile();
};

ProjectPath.prototype.isDirty = function() {

};

ProjectPath.prototype.getSalesforceType = function() {

};

ProjectPath.prototype.getServerId = function() {

};

module.exports = ProjectPath;