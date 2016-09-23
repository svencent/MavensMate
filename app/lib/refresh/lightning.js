'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var logger    = require('winston');
var fs        = require('fs-extra-promise');

function LightningRefresher(project, components) {
  this.project = project;
  this.components = components;
}

LightningRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing Lightning', self.components);
    self.project.sfdcClient.getLightingServerProperties(self.components, true)
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
      _.each(self.components, function(c) {
        var serverCopy = _.find(serverProperties, function(sp) {
          return sp.Id === c.getLocalStoreProperties().id;
        });
        logger.debug('replacing local copy with server copy', serverCopy);
        fs.writeFileSync(c.getPath(), serverCopy.Source);
      });
      resolve();
    } catch(e) {
      reject(e);
    }
  });
};

LightningRefresher.refreshAll = function(project, components) {
  return new Promise(function(resolve, reject) {
    var lightningRefresher = new LightningRefresher(project, components);
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