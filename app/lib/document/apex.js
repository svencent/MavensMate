'use strict';

var inherits  = require('inherits');
var Document  = require('./document');
var logger    = require('winston');

var apexTypes = [ 'ApexClass', 'ApexPage', 'ApexComponent', 'ApexTrigger' ];

var ApexDocument = function(project, filePath) {
  Document.call(this, project, filePath);
}

inherits(ApexDocument, Document);

ApexDocument.isApexType = function(xmlName) {
  return apexTypes.indexOf(xmlName) >= 0;
};

module.exports = ApexDocument;