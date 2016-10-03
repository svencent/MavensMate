// component should be able to tell whether it's a directory and whether it's parent directory is "aura"
// if so, the component is an aura bundle, which is not explicitly listed in local.json
//
'use strict';

var _                 = require('lodash');
var logger            = require('winston');
var path              = require('path');
var util              = require('../util');
var Document          = require('../document').Document;
var LightningService  = require('../services/lightning');

function LightningDeleter(project, documents) {
  this.project = project;
  this.documents = documents;
  this.lightningService = new LightningService(project);
}

LightningDeleter.prototype.delete = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Deleting Lightning', self.documents);
    var deleteResults;
    var deletedIds = [];
    var deletePromises = [];
    var lightningBundles = [];
    _.each(self.documents, function(d) {
      if (d.isLightningBundle()) {
        deletePromises.push(self.lightningService.deleteBundleByName(d.getBaseName()));
        lightningBundles.push(d);
      } else if (d.isLightningBundleItem()) {
        deletePromises.push(self.lightningService.deleteBundleItem(d.getLocalStoreProperties().id));
      }
    });
    Promise.all(deletePromises)
      .then(function(results) {
        deleteResults = results;
        logger.debug('Delete results', deleteResults);

        _.each(deleteResults, function(result) {
          if (result.success) deletedIds.push(result.id);
        });

        _.each(self.documents, function(d) {
          if (d.isLightningBundle()) {
            d.deleteFromFileSystem();
          } else if (d.isLightningBundleItem()) {
            if (deletedIds.indexOf(d.getLocalStoreProperties().id) >= 0) d.deleteFromFileSystem();
          }
        });

        if (lightningBundles.length > 0) {
          self.project.packageXml.remove(self.documents);
          self.project.packageXml.save();
        }

        self.project.localStore.removeById(deletedIds); // todo bundle
        _.each(self.documents, function(d) {
          var re = new RegExp('^src\/aura\/'+d.getName()+'\/');
          self.project.localStore.removeKeyByRegEx(re);
        });
        return self.project.serverStore.refreshTypes(self.project.sfdcClient, ['AuraDefinitionBundle']);
      })
      .then(function() {
        resolve(deleteResults);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

LightningDeleter.deleteAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var lightningDeleter = new LightningDeleter(project, documents);
    lightningDeleter.delete()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = LightningDeleter;