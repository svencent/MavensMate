'use strict';

var _             = require('lodash');
var logger        = require('winston');
var path          = require('path');
var util          = require('../util');
var Document      = require('../document').Document;
var Destructive   = require('../deploy/destructive');

function ApexDeleter(project, documents) {
  this.project = project;
  this.documents = documents;
}

ApexDeleter.prototype.delete = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('Deleting Apex', self.documents);
    var deleteResults;
    var deletedIds = [];
    var deletePromises = [];
    _.each(self.documents, function(d) {
      deletePromises.push(self.project.sfdcClient.delete(d.getType(), d.getLocalStoreProperties().id))
    });
    Promise.all(deletePromises)
      .then(function(results) {
        deleteResults = results;
        logger.debug('Delete results', deleteResults);

        _.each(deleteResults, function(result) {
          if (result.success) deletedIds.push(result.id);
        });

        _.each(self.documents, function(d) {
          if (deletedIds.indexOf(d.getLocalStoreProperties().id) >= 0) d.deleteFromFileSystem();
        });
        self.project.packageXml.remove(self.documents);
        self.project.packageXml.save();
        self.project.localStore.removeById(deletedIds);
        return self.project.serverStore.refreshTypes(self.project.sfdcClient, Document.getTypes(self.documents));
      })
      .then(function() {
        resolve(deleteResults);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

ApexDeleter.deleteAll = function(project, documents) {
  return new Promise(function(resolve, reject) {
    var apexDeleter = new ApexDeleter(project, documents);
    apexDeleter.delete()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ApexDeleter;