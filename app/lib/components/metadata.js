'use strict';

var inherits  = require('inherits');
var Component = require('./component');

var MetadataComponent = function(project, filePath) {
  Component.call(this, arguments);
}

inherits(MetadataComponent, Component);

module.exports = MetadataComponent;