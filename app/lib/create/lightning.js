'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var documentUtil      = require('../document/util');
var Document          = require('../document').Document;
var LightningDocument = require('../document').LightningDocument;
var LightningService  = require('../services/lightning');
var createUtil        = require('./util');


function LightningCreator(project, requestBody) {
  this.project = project;
  this.requestBody = requestBody;
  this.lightningService = new LightningService(this.project);
}

LightningCreator.prototype.createBundle = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var newLightningDocument;
    var newPath;
    var newBundle;

    Promise.all([
      createUtil.mergeLightningTemplateAndWriteToDisk(self.project, self.requestBody),
      self.lightningService.createBundle(self.requestBody.apiName, self.requestBody.description)
    ])
    .then(function(res) {
      newPath = res[0];
      newBundle = res[1];
      var newLightningType = self.requestBody.lightningType;
      newLightningDocument = documentUtil.getDocumentsFromFilePaths(self.project, [newPath]).lightning[0];
      return self.lightningService.createBundleItem(
                                        newBundle.id,
                                        newLightningType,
                                        LightningDocument.getSourceFormatForType(newLightningType),
                                        newLightningDocument.getBodySync());

    })
    .then(function(newBundleItem) {
      newLightningDocument.updateLocalStoryEntry({ id: newBundleItem.id });
      self.project.packageXml.add([newLightningDocument]);
      self.project.packageXml.save();
      return self._updateStores(newLightningDocument);
    })
    .then(function() {
      resolve(newBundle);
    })
    .catch(function(err) {
      reject(err);
    });
  });
};

LightningCreator.prototype.createBundleItem = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var newLightningDocument;
    var newBundleItem;

    createUtil.mergeLightningTemplateAndWriteToDisk(self.project, self.requestBody)
      .then(function(newLightningPath) {
        var newLightningType = self.requestBody.lightningType;
        newLightningDocument = documentUtil.getDocumentsFromFilePaths(self.project, [newLightningPath]).lightning[0];
        return self.lightningService.createBundleItem(
                                          self.requestBody.bundleId,
                                          newLightningType,
                                          LightningDocument.getSourceFormatForType(newLightningType),
                                          newLightningDocument.getBodySync());

      })
      .then(function(res) {
        newBundleItem = res;
        newLightningDocument.updateLocalStoryEntry({ id: newBundleItem.id });
        return self._updateStores(newLightningDocument);
      })
      .then(function() {
        resolve(newBundleItem);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

LightningCreator.prototype._updateStores = function(newLightningDocument) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      self.project.sfdcClient.getLightningServerProperties([newLightningDocument])
        .then(function(serverProperties) {
          return Promise.all([
            self.project.localStore.update(serverProperties),
            self.project.serverStore.refreshTypes(self.project.sfdcClient, ['AuraDefinitionBundle'])
          ]);
        })
        .then(function() {
          resolve('Ok we are done');
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(e) {
      reject(e);
    }
  });
};

module.exports = LightningCreator;