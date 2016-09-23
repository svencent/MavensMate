'use strict';

var _                 = require('lodash');
var logger            = require('winston');
var Component         = require('../component').Component;
var LightningService  = require('../services/lightning');

function LightningCreator(project, components) {
  this.project = project;
  this.components = components;
}

LightningCreator.prototype.create = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      // logger.debug('Creating ApexDocuments', self.components);
      var createPromises = [];
      _.each(self.components, function(c) {
        createPromises.push(self.project.sfdcClient.createApexMetadata(d));
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

LightningCreator.prototype._updateStores = function(results) {
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

LightningCreator.createAll = function(project, components) {
  return new Promise(function(resolve, reject) {
    var lightningCreator = new LightningCreator(project, components);
    lightningCreator.create()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ApexCreator;