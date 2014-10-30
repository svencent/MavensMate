'use strict';
var Q         = require('q');
var _         = require('lodash');
var tmp       = require('tmp');
var temp      = require('temp');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
var parseXml  = require('xml2js').parseString;
var uuid      = require('node-uuid');
var events    = require('events');
var inherits  = require('inherits');
var SalesforceClient = require('./sfdc-client');

// Q.longStackSupport = true;

/**
 * Represents a deployment to one or more Salesforce.com servers
 * @param {Object} opts
 * @param {Array} opts.destinations - array of org connections
 * @param {Array} opts.checkOnly - whether this is a validate-only deployment
 * @param {Array} opts.runTests - whether to run tests during this deployment
 * @param {Array} opts.rollbackOnError - whether to rollback when the deployment fails
 * @param {Array} opts.package - deployment payload
 * @param {Array} opts.newDeploymentName - the name of the deployment to be saved for future deploys
 * @param {Array} opts.debugCategories - array of debug categories for the deployment
 */
function Deploy(opts) {
  util.applyProperties(this, opts);
}

inherits(Deploy, events.EventEmitter);


Deploy.prototype._getPayload = function() {

};

Deploy.prototype._getTargets = function() {

};

Deploy.prototype.compare = function() {

};

Deploy.prototype.validate = function() {

};

Deploy.prototype.execute = function() {
  var deferred = Q.defer();
  var self = this;
  var deployPromises = [];
  _.each(self._getTargets(), function(target) {
    deployPromises.push(self._deployToTarget(target));
  });

  Q.all(deployPromises)
    .then(function(deployResults) {
      deferred.resolve(deployResults);
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not complete deployment: '+err.message));
    })
    .done();

  return deferred.promise;
};

Deploy.prototype._deployToTarget = function(target) {
  var deferred = Q.defer();
  var self = this;

  var deployClient = new SalesforceClient({ username: target.username, password: target.password });
  deployClient.initialize()
    .then(function() {
      return deployClient.deploy(self._getPayload());
    })
    .then(function(deployResult) {
      console.log('deploy result!');
      console.log(deployResult);
      deferred.resolve(deployResult);
    });
    ['catch'](function(err) {
      deferred.reject(new Error('Could not deploy to target: '+JSON.stringify(target)+', '+err.message));
    })
    .done();

  return deferred.promise;
};

module.exports = Deploy;