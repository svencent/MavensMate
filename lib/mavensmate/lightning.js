'use strict';

var Q = require('q');

var LightningService = function(sfdcClient){
  this.sfdcClient = sfdcClient;
};

LightningService.prototype.createBundle = function(apiName, description) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinitionBundle').create({
    Description: description, // my description
    DeveloperName: apiName, // cool_bro
    MasterLabel: apiName, // cool bro
    ApiVersion: this.sfdcClient.apiVersion || '32.0'
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.getBundle = function(bundleId) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.query('Select Id, AuraDefinitionBundleId,AuraDefinitionBundle.DeveloperName,DefType,Format FROM AuraDefinition WHERE AuraDefinitionBundleId = \''+bundleId+'\'', function(err, res) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.update = function(components) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinition').update(components, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.updateComponent = function(id, source) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinition').update({
    Id : id,
    Source : source
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.createComponent = function(bundleId) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
    AuraDefinitionBundleId: bundleId,
    DefType: 'COMPONENT',
    Format: 'XML', 
    Source: '<aura:component></aura:component>'
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.createInterface = function(bundleId) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
    AuraDefinitionBundleId: bundleId,
    DefType: 'INTERFACE',
    Format: 'XML', 
    Source: '<aura:interface description="Interface template">↵ <aura:attribute name="example" type="String" default="" description="An example attribute."/>↵</aura:interface>'
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.createHelper = function(bundleId) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
    AuraDefinitionBundleId: bundleId,
    DefType: 'INTERFACE',
    Format: 'XML', 
    Source: '<aura:interface description="Interface template">↵ <aura:attribute name="example" type="String" default="" description="An example attribute."/>↵</aura:interface>'
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

LightningService.prototype.createEvent = function(bundleId) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
    AuraDefinitionBundleId: bundleId,
    DefType: 'EVENT',
    Format: 'XML', 
    Source: '<aura:event type="APPLICATION" description="Event template" />'
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

module.exports = LightningService;

