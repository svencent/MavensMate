var fs          = require('fs');
var path        = require('path');
var _           = require('lodash');
var logger      = require('winston');
var Component   = require('./component');
var util        = require('../util');

var apexTypes = [ 'ApexClass', 'ApexPage', 'ApexComponent', 'ApexTrigger' ];

var _isMetaXmlFile = function(filePath) {
  return util.endsWith(filePath, '-meta.xml');
};

var _getAssociatedDocumentPath = function(metaXmlFilePath) {
  return metaXmlFilePath.replace('-meta.xml', '');
};

module.exports.getComponentsFromFilePaths = function(project, paths) {
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
    //   var c = new Component(project, _getAssociatedDocumentPath(p));
    // }
    else {
      var c = new Component(project, p);
    }

    if (!c.getLocalStoreProperties()) {
      /*
        look in server store, as this is a file that MAY be on the server, but it's not in our local store yet
      */
      var serverStoreEntry = c.getServerStoreProperties();
      if (serverStoreEntry) {
        c.addServerStoreEntryToLocalStore(serverStoreEntry);
      } else {
        c.addUnknownLocalStoreEntry();
      }
    }

    if (apexTypes.indexOf(c.getType()) >= 0) {
      result.apex.push(c);
    } else if (c.getType() === 'AuraDefinitionBundle') {
      result.lightning.push(c);
    } else {
      result.metadata.push(c);
    }
  });
  return result;
};