'use strict';

var inherits  = require('inherits');
var Document  = require('./document');
var _         = require('lodash');
var path      = require('path');
var fs        = require('fs-extra-promise');

var lightningTypeToSourceFormat = {
  Application: 'xml',
  Component: 'xml',
  Controller: 'js',
  Design: 'xml',
  Documentation: 'xml',
  Event: 'xml',
  Helper: 'js',
  Interface: 'xml',
  Renderer: 'js',
  Style: 'css',
  Svg: 'svg',
  Tokens: 'xml'
};

var lightningTypeToExtension = {
  Application: 'app',
  Component: 'cmp',
  Controller: 'js',
  Design: 'design',
  Documentation: 'auradoc',
  Event: 'evt',
  Helper: 'js',
  Interface: 'intf',
  Renderer: 'js',
  Style: 'css',
  Svg: 'svg',
  Tokens: 'tokens'
};

var suffices = {
  Controller: 'Controller',
  Helper: 'Helper',
  Renderer: 'Renderer'
};

var LightningDocument = function(project, filePath) {
  Document.call(this, project, filePath);
}

inherits(LightningDocument, Document);

LightningDocument.prototype.getLightningType = function() {
  var self = this;
  var typesForExtension = [];
  for (var types in lightningTypeToExtension) {
    if (this.hasOwnProperty(types)) {
      if (this[ types ] === self.getExtension())
        typesForExtension.push(types);
    }
  }
  if (typesForExtension.length === 1) {
    return typesForExtension[0];
  } else {
    if (_.endsWith(self.getName(), 'Renderer')) {
      return 'Renderer';
    } else if (_.endsWith(self.getName(), 'Controller')) {
      return 'Controller';
    } else if (_.endsWith(self.getName(), 'Helper')) {
      return 'Helper';
    }
  }
};

/**
 * Take a lightning type (Controller, documentation, event, etc.) and returns the appropriate filename (fooController.js, foo.auradoc, foo.evt, etc.)
 * @param  {String} apiName - api name for the lightning bundle
 * @param  {String} type    - lightning type
 * @return {String}         - file name
 */
LightningDocument.getFileNameForType = function(apiName, type) {
  return (suffices[_.capitalize(type)] ? apiName + suffices[_.capitalize(type)] : apiName) + '.' + LightningDocument.getExtensionForType(_.capitalize(type));
};

/**
 * Returns the extension for the lightning type
 * @param  {String} type - lightning type
 * @return {String}      file extension for the lightning type
 */
LightningDocument.getExtensionForType = function(type) {
  return lightningTypeToExtension[_.capitalize(type)];
};

LightningDocument.getSourceFormatForType = function(type) {
  return lightningTypeToSourceFormat[_.capitalize(type)];
};

LightningDocument.getBundleType = function(project, bundleName) {
  var bundlePath = path.join(project.path, 'src', 'aura', bundleName);
  if (fs.existsSync(path.join(bundlePath, bundleName+'.app'))) {
    return 'APPLICATION';
  } else if (fs.existsSync(path.join(bundlePath, bundleName+'.cmp'))) {
    return 'COMPONENT';
  } else if (fs.existsSync(path.join(bundlePath, bundleName+'.intf'))) {
    return 'INTERFACE';
  } else if (fs.existsSync(path.join(bundlePath, bundleName+'.evt'))) {
    return 'EVENT';
  } else if (fs.existsSync(path.join(bundlePath, bundleName+'.tokens'))) {
    return 'TOKENS';
  }
};


module.exports = LightningDocument;
