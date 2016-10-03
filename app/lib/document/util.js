var Promise             = require('bluebird');
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

var _ensureProjectSubscriptionForDocumentTypes = function(project, documents) {
  var projectSubscription = project.projectJson.get('subscription') || [];
  _.each(documents, function(d) {
    if (projectSubscription.indexOf(d.getType()) === -1) {
      projectSubscription.push(d.getType());
    }
  });
  project.projectJson.set({
    subscription: projectSubscription
  });
};

module.exports.ensureServerIndexForDocumentTypes = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var typesToIndex = [];
    _.each(documents, function(d) {
      if (!project.serverStore.hasIndexForType(d.getType())) {
        typesToIndex.push(d.getType());
      }
    });
    if (typesToIndex.length > 0) {
      project.serverStore.refreshTypes(project.sfdcClient, typesToIndex)
        .then(function(res) {
          resolve();
        })
        .catch(function(err) {
          reject(err);
        });
    } else {
      resolve();
    }
  });
};

module.exports.getDocumentsFromFilePaths = function(project, paths) {
  var result = {
    apex: [],
    metadata: [],
    lightning: []
  };

  var documents = [];
  _.each(paths, function(p) {
    documents.push(new Document(project, p));
  });

  _ensureProjectSubscriptionForDocumentTypes(project, documents);

  _.each(documents, function(d) {

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
      result.apex.push(new ApexDocument(project, d.getPath()));
    } else if (d.isLightningBundle() || d.isLightningBundleItem()) {
      result.lightning.push(new LightningDocument(project, d.getPath()));
    } else {
      result.metadata.push(new MetadataDocument(project, d.getPath()));
    }

  });
  return result;
};