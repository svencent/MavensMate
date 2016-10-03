var fs                  = require('fs');
var path                = require('path');
var _                   = require('lodash');
var logger              = require('winston');
var Document            = require('./document');
var LightningDocument   = require('./lightning');
var ApexDocument        = require('./apex');
var MetadataDocument    = require('./metadata');
var util                = require('../util');

var apexTypes = [ 'ApexClass', 'ApexPage', 'ApexComponent', 'ApexTrigger' ];

var _isMetaXmlFile = function(filePath) {
  return util.endsWith(filePath, '-meta.xml');
};

var _getAssociatedDocumentPath = function(metaXmlFilePath) {
  return metaXmlFilePath.replace('-meta.xml', '');
};

module.exports.getDocumentsFromFilePaths = function(project, paths) {
  var result = {
    apex: [],
    metadata: [],
    lightning: []
  };
  _.each(paths, function(p) {
    // if (fs.statSync(p).isDirectory()) {
    //   // todo: get contents
    // }
    // // } else if (_isMetaXmlFile(p)) {
    // //   var c = new Document(project, _getAssociatedDocumentPath(p));
    // // }
    // else {
    //   var d = new Document(project, p);
    // }

    var d = new Document(project, p);

    if (!d.getLocalStoreProperties() && !d.isDirectory()) {
      /*
        look in server store, as this is a file that MAY be on the server, but it's not in our local store yet
      */
      var serverStoreEntry = d.getServerStoreProperties();
      if (serverStoreEntry) {
        d.addServerStoreEntryToLocalStore(serverStoreEntry);
      } else {
        d.addUnknownLocalStoreEntry();
      }
    }

    if (ApexDocument.isApexType(d.getType())) {
      result.apex.push(new ApexDocument(project, p));
    } else if (d.isLightningBundle() || d.isLightningBundleItem()) {
      result.lightning.push(new LightningDocument(project, p));
    } else {
      result.metadata.push(new MetadataDocument(project, p));
    }
  });
  return result;
};