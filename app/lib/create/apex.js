'use strict';

var _           = require('lodash');
var logger      = require('winston');
var Component   = require('../components').Component;

function ApexCreator(project, components) {
  this.project = project;
  this.components = components;
}

ApexCreator.prototype.create = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var createPromises = [];
      _.each(self.components, function(c) {
        createPromises.push(self.project.sfdcClient.createApexMetadata(c));
      });
      Promise.all(createPromises)
        .then(function(results) {
          return Promise.all([
            self._updateStores(results),
            self.project.packageXml.add(self.components)
          ]);
        })
        .then(function() {
          self.project.packageXml.save();
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
        var doc = self.components[i];
        doc.updateLocalStoryEntry({ id: r.id });
      });
      self.project.sfdcClient.getApexServerProperties(self.components)
        .then(function(serverProperties) {
          return Promise.all([
            self.project.localStore.update(serverProperties),
            self.project.serverStore.refreshTypes(self.project.sfdcClient, Component.getTypes(self.components))
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

ApexCreator.createAll = function(project, components) {
  return new Promise(function(resolve, reject) {
    var apexCreator = new ApexCreator(project, components);
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