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
var TemplateService = require('../create/template');

/**
 * MavensMate Document
 *
 * @constructor
 * @param {Object} [opts] - Options
 * @param {String} [opts.path] - file path
 * @param {String} [opts.project] - project instance
 */
var Document = function(project, filePath) {
  this._project = project;
  this._sfdcClient = project.sfdcClient;
  this._path = path.normalize(filePath);
  this._basename = path.basename(this._path);
  this._extension = path.extname(this._path).replace(/./, ''); // ext NOT .ext
  this._serverProperties = null;
  this._localProperties = null;
  this._describe = null;
}

Document.prototype.toString = function() {
  return {
    uri: this.getPath(),
    basename: this.getBaseName(),
    extension: this.getExtension()
  }
};

Document.prototype.getName = function() {
  return path.basename(this.getPath(), path.extname(this.getPath()));
}

Document.prototype.getDescribe = function() {
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

Document.prototype.getExtension = function() {
  return this._extension;
};

Document.prototype.getMetaXmlPath = function() {
  return [this.getPath(),'-meta.xml'].join('');
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

/**
 * Returns the full file system path of the component
 */
Document.prototype.getPath = function() {
  return this._path;
};

Document.prototype._getLocalStoreKey = function() {
  return this.getPath().split(this._project.name+path.sep)[1];
};

Document.prototype._getServerStoreKey = function() {
  return this.getPath().split(this._project.name+path.sep+'src'+path.sep)[1]; // todo: "src" could be any package name
};

Document.prototype.getRelativePath = function() {
  return this._getLocalStoreKey();
};

Document.prototype.addUnknownLocalStoreEntry = function() {
  var entry = {};
  entry[this._getLocalStoreKey()] = {
    type: this.getType(),
    localState: 'unknown'
  };
  this._project.localStore.set(entry);
};

Document.prototype.updateLocalStoryEntry = function(obj) {
  var existingEntryValue = this.getLocalStoreProperties();
  for (var key in obj) {
    existingEntryValue[key] = obj[key];
  }
  var entry = {};
  entry[this._getLocalStoreKey()] = existingEntryValue;
  this._project.localStore.set(entry);
};

Document.prototype.addServerStoreEntryToLocalStore = function(serverStoreEntry) {
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
Document.prototype.getLocalStoreProperties = function() {
  return this._project.localStore.get(this._getLocalStoreKey());
};

/**
 * Returns server store entry if it exists
 * @return {Object}
 */
Document.prototype.getServerStoreProperties = function() {
  return this._project.serverStore.find('fileName', this._getServerStoreKey());
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

Document.prototype.getType = function() {
  if (this.getLocalStoreProperties() && this.getLocalStoreProperties().type) {
    return this.getLocalStoreProperties().type;
  } else if (this.isLightningBundleItem() || this.isLightningBundle()) {
    // todo: metadata api server properties refer to bundle items as "AuraDefinitionBundle"
    // instead of "AuraDefinition"
    return 'AuraDefinitionBundle';
  } else {
    var self = this;
    var metadataDescribe = _.find(self._project.sfdcClient.describe.metadataObjects, function(d) {
      return self.getExtension() === d.suffix;
    });
    if (metadataDescribe) return metadataDescribe.xmlName;
  }
  return null;
};

Document.prototype.isLightningBundleItem = function() {
  return path.basename(path.dirname(path.dirname(this.getPath()))) === 'aura';
};

Document.prototype.isLightningBundle = function() {
  return path.basename(path.dirname(this.getPath())) === 'aura';
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
  if (this.isDirectory()) {
    util.emptyDirectoryRecursiveSync(this.getPath());
    fs.removeSync(this.getPath());
  } else {
    fs.removeSync(this.getPath());
    logger.warn('meta path is ', this.getMetaXmlPath());
    if (fs.existsSync(this.getMetaXmlPath())) {
      fs.removeSync(this.getMetaXmlPath());
    }
  }
};

Document.getTypes = function(documents) {
  var types = [];
  _.each(documents, function(d) {
    if (types.indexOf(d.getType()) === -1) types.push(d.getType());
  });
  return types;
};

module.exports = Document;