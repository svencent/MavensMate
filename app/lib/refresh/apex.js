'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var logger    = require('winston');
var fs        = require('fs-extra-promise');

function ApexRefresher(project, components) {
  this.project = project;
  this.components = components;
}

ApexRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing ApexDocuments', self.components);
    self.project.sfdcClient.getApexServerProperties(self.components, true)
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

ApexRefresher.prototype.replaceLocalCopies = function(serverProperties) {
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

ApexRefresher.refreshAll = function(project, components) {
  return new Promise(function(resolve, reject) {
    var apexRefresher = new ApexRefresher(project, components);
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