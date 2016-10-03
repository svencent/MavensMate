'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var logger      = require('winston');
var fs          = require('fs-extra-promise');
var ApexSymbols = require('../services/symbol');

function ApexRefresher(project, documents) {
  this.project = project;
  this.documents = documents;
  this.apexSymbols = new ApexSymbols(project);
}

ApexRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing ApexDocuments', self.documents);
    self.project.sfdcClient.getApexServerProperties(self.documents, true)
      .then(function(serverProperties) {
        self.project.localStore.update(serverProperties);
        self._updateSymbols(); // we don't wait for this promise for performance reasons
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

ApexRefresher.prototype.replaceLocalCopies = function(serverProperties) {
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

ApexRefresher.prototype._updateSymbols = function() {
  var apexClassDocuments = _.filter(this.documents, function(d) {
    return d.getType() === 'ApexClass';
  });
  this.apexSymbols.indexSymbolsForApexClassDocuments(apexClassDocuments)
    .then(function(res) {
      logger.debug('index symbol result', res);
    })
    .catch(function(err) {
      logger.error('failed to index apex symbols', err);
    });
};

ApexRefresher.refreshAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var apexRefresher = new ApexRefresher(project, documents);
    apexRefresher.refresh()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ApexRefresher;