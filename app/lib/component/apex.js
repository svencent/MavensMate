var Component  = require('./component');
var inherits  = require('inherits');

var ApexDocument = function(opts) {

}

inherits(ApexDocument, Component);

ApexDocument.types = [
  'ApexClass', 'ApexPage', 'ApexTrigger', 'ApexComponent'
];

ApexDocument.compile = function(apexDocuments) {

};

ApexDocument.refresh = function(apexDocuments) {

};

ApexDocument.delete = function(apexDocuments) {

};

module.exports = ApexDocument;