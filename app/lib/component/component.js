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
 * MavensMate Component
 *
 * @constructor
 * @param {Object} [opts] - Options
 * @param {String} [opts.path] - file path
 * @param {String} [opts.project] - project instance
 */
var Component = function(project, documentPath) {
  this._project = project;
  this._sfdcClient = project.sfdcClient;
  this._path = path.normalize(documentPath);
  this._basename = path.basename(this._path);
  this._extension = path.extname(this._path).replace(/./, '');
  this._serverProperties = null;
  this._localProperties = null;
  this._describe = null;
}

Component.prototype.toString = function() {
  return {
    uri: this.getPath(),
    basename: this.getBaseName(),
    extension: this.getExtension()
  }
};

Component.prototype.getName = function() {
  return path.basename(this.getPath(), path.extname(this.getPath()));
}

Component.prototype.getDescribe = function() {
  var self = this;
  if (!this._describe) {
    this._describe = _.find(this._sfdcClient.describe.metadataObjects, function(o) {
      if (self.getLocalStoreProperties()) {
        return o.xmlName === self.getLocalStoreProperties().type;
      } else {
        return o.suffix === self.getExtension();
      }
    });
  }
  return this._describe;
};

Component.prototype.getExtension = function() {
  return this._extension;
};

Component.prototype.getMetaXmlPath = function() {
  return [this.getPath(),'-meta.xml'].join();
};

Component.prototype.isMetaXmlFile = function() {
  return util.endsWith(this.getPath(), '-meta.xml');
};

Component.prototype.getAssociatedDocument = function() {
  if (this.isMetaXmlFile()) {
    return new Component(this._project, this.getPath().replace('-meta.xml', ''));
  }
};

Component.prototype.getBaseName = function() {
  return this._basename;
};

/**
 * Returns the full file system path of the component
 */
Component.prototype.getPath = function() {
  return this._path;
};

Component.prototype._getLocalStoreKey = function() {
  return this.getPath().split(this._project.name+path.sep)[1];
};

Component.prototype._getServerStoreKey = function() {
  return this.getPath().split(this._project.name+path.sep+'src'+path.sep)[1]; // todo: "src" could be any package name
};

Component.prototype.getRelativePath = function() {
  return this._getLocalStoreKey();
};

Component.prototype.addUnknownLocalStoreEntry = function() {
  var entry = {};
  entry[this._getLocalStoreKey()] = {
    type: this.getDescribe().xmlName,
    localState: 'unknown'
  };
  this._project.localStore.set(entry);
};

Component.prototype.updateLocalStoryEntry = function(obj) {
  var existingEntryValue = this.getLocalStoreProperties();
  for (var key in obj) {
    existingEntryValue[key] = obj[key];
  }
  var entry = {};
  entry[this._getLocalStoreKey()] = existingEntryValue;
  this._project.localStore.set(entry);
};

Component.prototype.addServerStoreEntryToLocalStore = function(serverStoreEntry) {
  var entry = {};
  entry[this._getLocalStoreKey()] = {
    id: serverStoreEntry.id,
    fullName: serverStoreEntry.fullName,
    type: serverStoreEntry.type,
    lastModifiedById: serverStoreEntry.lastModifiedById,
    lastModifiedDate: serverStoreEntry.lastModifiedDate,
    lastModifiedByName: serverStoreEntry.lastModifiedByName,
    createdDate: serverStoreEntry.createdDate,
    createdById: serverStoreEntry.createdById,
    createdByName: serverStoreEntry.createdByName,
    fileName: path.join('unpackaged', serverStoreEntry.fileName), // todo
    localState: 'dirty'
  };
  this._project.localStore.set(entry);
};

/**
 * Returns local store entry
 * @return {Object}
 */
Component.prototype.getLocalStoreProperties = function() {
  // if (!this._localProperties) {
  //   this._localProperties = this._project.localStore.get(this._getLocalStoreKey());
  // }
  // return this._localProperties;
  return this._project.localStore.get(this._getLocalStoreKey());
};

/**
 * Returns server store entry if it exists
 * @return {Object}
 */
Component.prototype.getServerStoreProperties = function() {
  // if (!this._serverProperties) {
  //   this._serverProperties = this._project.serverStore.find('fileName', this._getServerStoreKey());
  // }
  // return this._serverProperties;
  return this._project.serverStore.find('fileName', this._getServerStoreKey());
};

/**
 * Returns file body as a string
 * @return {String}
 */
Component.prototype.getBodySync = function() {
  return fs.readFileSync(this.getPath(), 'utf8');
};

/**
 * Returns file body as a string (async)
 * @return {Promise}
 */
Component.prototype.getBody = function() {
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

Component.prototype.getType = function() {
  if (this.getLocalStoreProperties() && this.getLocalStoreProperties().type) {
    return this.getLocalStoreProperties().type;
  } else {
    var self = this;
    var metadataDescribe = _.find(this.project.sfdcClient.describe.metadataObjects, function(d) {
      return self.getExtension() === d.suffix;
    });
    if (metadataDescribe) return metadataDescribe.xmlName;
  }
  return null;
};

Component.prototype.existsOnFileSystem = function() {
  return fs.existsSync(this.getPath());
};

Component.prototype.isDirectory = function() {
  return fs.statSync(this.getPath()).isDirectory();
};

Component.prototype.isFile = function() {
  return fs.statSync(this.getPath()).isFile();
};

Component.prototype.deleteFromFileSystem = function() {
  fs.removeSync(this.getPath());
};

Component.getTypes = function(components) {
  var types = [];
  _.each(components, function(c) {
    if (types.indexOf(c.getType()) === -1) types.push(c.getType());
  });
  return types;
};

module.exports = Component;