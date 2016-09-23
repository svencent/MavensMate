'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var temp      = require('temp');
var logger    = require('winston');
var fs        = require('fs-extra-promise');
var Package   = require('../package');
var path      = require('path');

function MetadataRefresher(project, documents) {
  this.project = project;
  this.documents = documents;
}

MetadataRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing Metadata', self.documents);
    var packageXml = new Package();
    packageXml.initializeFromDocuments(self.documents)
    var serverProperties;
    var tmpPath = temp.mkdirSync({ prefix: 'mm_' });
    var tempRetrieveUnpackaged = path.join(tmpPath, 'unpackaged');
    self.project.sfdcClient.retrieveUnpackaged(packageXml.contents, true, tmpPath)
      .then(function(retrieveResult) {
        serverProperties = retrieveResult.fileProperties;
        return self.project.localStore.update(serverProperties);
      })
      .then(function() {
        _.each(self.documents, function(d) {
          var serverCopyDefinition = _.find(serverProperties, function(sp) {
            return sp.id === d.getLocalStoreProperties().id;
          });
          logger.debug(serverCopyDefinition);
          var serverCopyRetrievePath = path.join(tmpPath, serverCopyDefinition.fileName);
          fs.ensureDirSync(path.dirname(serverCopyRetrievePath));
          fs.copySync(serverCopyRetrievePath, d.getPath());
          if (d.getDescribe().metaFile) {
            fs.copySync([serverCopyRetrievePath,'-meta.xml'].join(''), [d.getPath(),'-meta.xml'].join(''));
          }
        });
        resolve();
      })
      .catch(function(err) {
        logger.debug('Could not refresh metadata: '+err.message);
        reject(err);
      })
      .done();
  });
};

MetadataRefresher.prototype.replaceLocalCopies = function(serverProperties) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      _.each(self.documents, function(d) {
        var serverCopy = _.find(serverProperties, function(sp) {
          return sp.Id === d.getLocalStoreProperties().id;
        });
        logger.debug('replacing local copy with server copy', serverCopy);
        if (d.getLocalStoreProperties().type === 'ApexClass' || d.getLocalStoreProperties().type === 'ApexTrigger') {
          fs.writeFileSync(d.getPath(), serverCopy.Body);
        } else {
          fs.writeFileSync(d.getPath(), serverCopy.Markup);
        }
      });
      resolve();
    } catch(e) {
      reject(e);
    }
  });
};

MetadataRefresher.refreshAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var metadataRefresher = new MetadataRefresher(project, documents);
    metadataRefresher.refresh()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = MetadataRefresher;