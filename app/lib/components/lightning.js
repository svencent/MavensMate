'use strict';

var inherits  = require('inherits');
var Component = require('./component');

var types = {
  STYLE: 'STYLE',
  APPLICATION: 'APPLICATION',
  DOCUMENTATION: 'DOCUMENTATION',
  COMPONENT: 'COMPONENT',
  EVENT: 'EVENT',
  INTERFACE: 'INTERFACE',
  CONTROLLER: 'CONTROLLER',
  HELPER: 'HELPER',
  RENDERER: 'RENDERER',
  TOKENS: 'TOKENS',
  DESIGN: 'DESIGN',
  SVG: 'SVG'
};

var extensionDict = {
  css: types.STYLE,
  app: types.APPLICATION,
  auradoc: types.DOCUMENTATION,
  cmp: types.COMPONENT,
  evt: types.EVENT,
  intf: types.INTERFACE,
  tokens: types.TOKENS,
  design: types.DESIGN,
  svg: types.SVG,
  js: [
    types.CONTROLLER,
    types.HELPER,
    types.RENDERER
  ]
};

var LightningComponent = function(project, filePath) {
  Component.call(this, project, filePath);
}

inherits(LightningComponent, Component);

LightningComponent.prototype.getLightningType = function() {

};

LightningComponent.prototype.getSuffix = function() {

};

module.exports = LightningComponent;
