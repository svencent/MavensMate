var fs                  = require('fs');
var path                = require('path');
var _                   = require('lodash');
var logger              = require('winston');
var Component           = require('./component');
var LightningComponent  = require('./lightning');
var ApexComponent       = require('./apex');
var MetadataComponent   = require('./metadata');
var util                = require('../util');

var apexTypes = [ 'ApexClass', 'ApexPage', 'ApexComponent', 'ApexTrigger' ];

var _isMetaXmlFile = function(filePath) {
  return util.endsWith(filePath, '-meta.xml');
};

var _getAssociatedComponentPath = function(metaXmlFilePath) {
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
    //   var c = new Component(project, _getAssociatedComponentPath(p));
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

    if (ApexComponent.isApexType(c.getType())) {
      result.apex.push(new ApexComponent(project, p));
    } else if (c.getType() === 'AuraDefinitionBundle') {
      result.lightning.push(new LightningComponent(project, p));
    } else {
      result.metadata.push(new MetadataComponent(project, p));
    }
  });
  return result;
};