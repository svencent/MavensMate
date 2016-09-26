'use strict';

var inherits  = require('inherits');
var Document  = require('./document');
var _         = require('lodash');

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
  Svg: 'svg'
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
  Svg: 'svg'
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
  return (suffices[type] ? apiName + suffices[type] : apiName) + '.' + LightningDocument.getExtensionForType(type);
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


module.exports = LightningDocument;
