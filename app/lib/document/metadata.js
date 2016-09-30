'use strict';

var inherits  = require('inherits');
var Document = require('./document');

var MetadataDocument = function(project, filePath) {
  Document.call(this, project, filePath);
}

inherits(MetadataDocument, Document);

module.exports = MetadataDocument;