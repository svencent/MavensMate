var fs        = require('fs');
var path      = require('path');
var _         = require('lodash');
var logger    = require('winston');
var Document  = require('./document');
var util      = require('../util');

var apexTypes = [ 'ApexClass', 'ApexPage', 'ApexComponent', 'ApexTrigger' ];

var _isMetaXmlFile = function(filePath) {
  return util.endsWith(filePath, '-meta.xml');
};

var _getAssociatedDocumentPath = function(metaXmlFilePath) {
  return metaXmlFilePath.replace('-meta.xml', '');
};

module.exports.getDocuments = function(project, paths) {
  var result = {
    apex: [],
    metadata: [],
    lightning: []
  };
  _.each(paths, function(p) {
    if (fs.statSync(p).isDirectory()) {
      // todo: get contents
    }
    // } else if (_isMetaXmlFile(p)) {
    //   var d = new Document(project, _getAssociatedDocumentPath(p));
    // }
    else {
      var d = new Document(project, p);
    }

    if (!d.getServerProperties()) {
      // this is a file that MAY be on the server, but it's not in our local store yet
      d.addUnknownLocalStoreEntry();
    }

    if (apexTypes.indexOf(d.getServerProperties().type) >= 0) {
      result.apex.push(d);
    } else if (d.getServerProperties().type === 'AuraDefinitionBundle') {
      result.lightning.push(d);
    } else {
      result.metadata.push(d);
    }
  });
  return result;
};