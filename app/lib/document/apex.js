var Document  = require('./document');
var inherits  = require('inherits');

var ApexDocument = function(opts) {

}

inherits(ApexDocument, Document);

ApexDocument.types = [
  'ApexClass', 'ApexPage', 'ApexTrigger', 'ApexComponent'
];

ApexDocument.compile = function(apexDocuments) {

};

ApexDocument.refresh = function(apexDocuments) {

};

ApexDocument.delete = function(apexDocuments) {

};

module.exports.Document = ApexDocument;