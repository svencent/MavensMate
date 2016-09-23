'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var logger    = require('winston');
var fs        = require('fs-extra-promise');

function LightningRefresher(project, documents) {
  this.project = project;
  this.documents = documents;
}

LightningRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing Lightning', self.documents);
    self.project.sfdcClient.getLightingServerProperties(self.documents, true)
      .then(function(serverProperties) {
        self.project.localStore.update(serverProperties);
        return self.replaceLocalCopies(serverProperties);
      })
      .then(function(res) {
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

LightningRefresher.prototype.replaceLocalCopies = function(serverProperties) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      _.each(self.documents, function(d) {
        var serverCopy = _.find(serverProperties, function(sp) {
          return sp.Id === d.getLocalStoreProperties().id;
        });
        logger.debug('replacing local copy with server copy', serverCopy);
        fs.writeFileSync(d.getPath(), serverCopy.Source);
      });
      resolve();
    } catch(e) {
      reject(e);
    }
  });
};

LightningRefresher.refreshAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var lightningRefresher = new LightningRefresher(project, documents);
    lightningRefresher.refresh()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = LightningRefresher;