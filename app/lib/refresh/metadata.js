'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var temp      = require('temp');
var logger    = require('winston');
var fs        = require('fs-extra-promise');
var Package   = require('../package');
var path      = require('path');

function MetadataRefresher(project, components) {
  this.project = project;
  this.components = components;
}

MetadataRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing Metadata', self.components);
    var packageXml = new Package();
    packageXml.initializeFromDocuments(self.components)
    var serverProperties;
    var tmpPath = temp.mkdirSync({ prefix: 'mm_' });
    var tempRetrieveUnpackaged = path.join(tmpPath, 'unpackaged');
    self.project.sfdcClient.retrieveUnpackaged(packageXml.contents, true, tmpPath)
      .then(function(retrieveResult) {
        serverProperties = retrieveResult.fileProperties;
        return self.project.localStore.update(serverProperties);
      })
      .then(function() {
        _.each(self.components, function(c) {
          var serverCopyDefinition = _.find(serverProperties, function(sp) {
            return sp.id === c.getLocalStoreProperties().id;
          });
          logger.debug(serverCopyDefinition);
          var serverCopyRetrievePath = path.join(tmpPath, serverCopyDefinition.fileName);
          fs.ensureDirSync(path.dirname(serverCopyRetrievePath));
          fs.copySync(serverCopyRetrievePath, c.getPath());
          if (c.getDescribe().metaFile) {
            fs.copySync([serverCopyRetrievePath,'-meta.xml'].join(''), [c.getPath(),'-meta.xml'].join(''));
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
      _.each(self.components, function(c) {
        var serverCopy = _.find(serverProperties, function(sp) {
          return sp.Id === c.getLocalStoreProperties().id;
        });
        logger.debug('replacing local copy with server copy', serverCopy);
        if (c.getLocalStoreProperties().type === 'ApexClass' || c.getLocalStoreProperties().type === 'ApexTrigger') {
          fs.writeFileSync(c.getPath(), serverCopy.Body);
        } else {
          fs.writeFileSync(c.getPath(), serverCopy.Markup);
        }
      });
      resolve();
    } catch(e) {
      reject(e);
    }
  });
};

MetadataRefresher.refreshAll = function(project, components) {
  return new Promise(function(resolve, reject) {
    var metadataRefresher = new MetadataRefresher(project, components);
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