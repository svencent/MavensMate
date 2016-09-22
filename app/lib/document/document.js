'use strict';

var Promise         = require('bluebird');
var _               = require('lodash');
var fs              = require('fs-extra-promise');
var path            = require('path');
var MetadataHelper  = require('../metadata').MetadataHelper;
var util            = require('../util');
var config          = require('../../config');
var request         = require('request');
var swig            = require('swig');
var logger          = require('winston');
var TemplateService = require('../services/template');

/**
 * MavensMate Document
 *
 * @constructor
 * @param {Object} [opts] - Options
 * @param {String} [opts.path] - file path
 * @param {String} [opts.project] - project instance
 */
var Document = function(project, documentPath) {
  this._project = project;
  this._sfdcClient = project.sfdcClient;
  this._path = path.normalize(documentPath);
  this._basename = path.basename(this._path);
  this._extension = path.extname(this._path).replace(/./, '');
  this._serverProperties = null;
  this._describe = null;
}

Document.prototype.toString = function() {
  return {
    uri: this.getPath(),
    basename: this.getBaseName(),
    extension: this.getExtension()
  }
};

Document.prototype.getDescribe = function() {
  var self = this;
  if (!this._describe) {
    this._describe = _.find(this._sfdcClient.describe.metadataObjects, function(o) {
      if (self.getServerProperties()) {
        return o.xmlName === self.getServerProperties().type;
      } else {
        return o.suffix === self.getExtension();
      }
    });
  }
  return this._describe;
};

Document.prototype.getExtension = function() {
  return this._extension;
};

Document.prototype.getMetaXmlPath = function() {
  return [this.getPath(),'-meta.xml'].join();
};

Document.prototype.isMetaXmlFile = function() {
  return util.endsWith(this.getPath(), '-meta.xml');
};

Document.prototype.getAssociatedDocument = function() {
  if (this.isMetaXmlFile()) {
    return new Document(this._project, this.getPath().replace('-meta.xml', ''));
  }
};

Document.prototype.getBaseName = function() {
  return this._basename;
};

Document.prototype.getPath = function() {
  return this._path;
};

Document.prototype._getLocalStoreKey = function() {
  return this.getPath().split(this._project.name+'/')[1];
};

Document.prototype.getRelativePath = function() {
  return this._getLocalStoreKey();
};

Document.prototype.addUnknownLocalStoreEntry = function() {
  var entry = {}
  entry[this._getLocalStoreKey()] = {
    // type: this.getDescribe().xmlName,
    localState: 'unknown'
  };
  this._project.localStore.set(entry);
};

/**
 * Returns local store entry
 * @return {Object}
 */
Document.prototype.getServerProperties = function() {
  if (!this._serverProperties) {
    this._serverProperties = this._project.localStore.get(this._getLocalStoreKey());
  }
  return this._serverProperties;
};

/**
 * Returns file body as a string
 * @return {String}
 */
Document.prototype.getBodySync = function() {
  return fs.readFileSync(this.getPath(), 'utf8');
};

/**
 * Returns file body as a string (async)
 * @return {Promise}
 */
Document.prototype.getBody = function() {
  return new Promise(function(resolve, reject) {
    return fs.readFile(this.getPath(), 'utf8')
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

Document.prototype.existsOnFileSystem = function() {
  return fs.existsSync(this.getPath());
};

Document.prototype.isDirectory = function() {
  return fs.statSync(this.getPath()).isDirectory();
};

Document.prototype.isFile = function() {
  return fs.statSync(this.getPath()).isFile();
};

Document.prototype.deleteFromFileSystem = function() {
  fs.removeSync(this.getPath());
};

module.exports = Document;