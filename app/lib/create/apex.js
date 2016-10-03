'use strict';

var Promise       = require('bluebird');
var _             = require('lodash');
var logger        = require('winston');
var Document      = require('../document').Document;
var documentUtil  = require('../document').util;

function ApexCreator(project, documents) {
  this.project = project;
  this.documents = documents;
}

ApexCreator.prototype.create = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var createPromises = [];
      _.each(self.documents, function(d) {
        createPromises.push(self.project.sfdcClient.createApexMetadata(d));
      });
      Promise.all(createPromises)
        .then(function(results) {
          self.project.packageXml.add(self.documents);
          self.project.packageXml.save();
          return self._updateStores(results);
        })
        .then(function() {
          resolve();
        })
        .catch(function(err) {
          // todo: delete local members
          reject(err);
        });
    } catch(e) {
      reject(e);
    }
  });
};

ApexCreator.prototype._updateStores = function(results) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      _.each(results, function(r, i) {
        var doc = self.documents[i];
        doc.updateLocalStoryEntry({ id: r.id });
      });
      self.project.sfdcClient.getApexServerProperties(self.documents)
        .then(function(serverProperties) {
          return Promise.all([
            self.project.localStore.update(serverProperties),
            self.project.serverStore.refreshTypes(self.project.sfdcClient, Document.getTypes(self.documents))
          ]);
        })
        .then(function() {
          resolve(_.flatten(results));
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(e) {
      reject(e);
    }
  });
};

ApexCreator.createAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var apexCreator = new ApexCreator(project, documents);
    apexCreator.create()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ApexCreator;