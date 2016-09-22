'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var logger    = require('winston');
var fs        = require('fs-extra-promise');

function ApexRefresher(project, documents) {
  this.project = project;
  this.documents = documents;
}

ApexRefresher.prototype.refresh = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Refreshing ApexDocuments', self.documents);
    self.project.sfdcClient.getApexServerProperties(self.documents, true)
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
      _.each(self.documents, function(d) {
        var serverCopy = _.find(serverProperties, function(sp) {
          return sp.Id === d.getServerProperties().id;
        });
        logger.debug('replacing local copy with server copy', serverCopy);
        if (d.getServerProperties().type === 'ApexClass' || d.getServerProperties().type === 'ApexTrigger') {
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