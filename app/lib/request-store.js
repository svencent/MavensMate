/**
 * @file Store of async requests submitted to the server
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _         = require('lodash');
var uuid      = require('uuid');
var events    = require('events');
var logger    = require('winston');

var RequestStore = function(){};

/**
 * Hash of requestId --> request
 * @type {Object}
 */
RequestStore.prototype.requests = {};

/**
 * Adds a request to the store
 * @param {Promise} thenable
 */
RequestStore.prototype.add = function(thenable) {
  var self = this;
  var request, requestId;
  requestId = uuid.v1();
  request = {
    id: requestId,
    complete: false,
    thenable: thenable
  };
  thenable
    .then(function(res) {
      self._finish(requestId, null, res);
    })
    .catch(function(err) {
      self._finish(requestId, err, null);
    });
  this.requests[requestId] = request;
  return requestId;
};

/**
 * Checks whether the request is complete
 * @param  {String}  requestId
 * @return {Boolean}           whether the request is complete
 */
RequestStore.prototype.isRequestComplete = function(requestId) {
  return this.requests[requestId].complete;
};

/**
 * Returns the result for a requestid
 * @param  {String} requestId
 * @return {Object}
 */
RequestStore.prototype.getResultForId = function(requestId) {
  var p = _.clone(this.requests[requestId]);
  delete p.thenable;
  delete this.requests[requestId];
  return p;
};

/**
 * TODO: we're doing a lot of gymnastics with the error/result objects, need to standardize with command.js's respond
 * @param  {String} requestId  - id of the job to mark as complete
 * @param  {Object} error  - should be an error object, but see TODO
 * @param  {Object} result - result object, typically formatted like { response: {  } }
 * @return {Nothing}
 */
RequestStore.prototype._finish = function(requestId, error, result) {
  logger.debug('finishing requestId: '+requestId);
  if (error) {
    logger.error(error);
  } else if (result) {
    logger.silly(result);
  }
  if (error && error instanceof Error) {
    this.requests[requestId].error = error.message;
    this.requests[requestId].stack = error.stack;
  } else if (result) {
    this.requests[requestId].result = result;
  } else {
    logger.error('Could not set request', requestId, 'as finished', error, result)
    throw new Error('Could not finish request '+requestId);
  }
  this.requests[requestId].complete = true;
};

module.exports = new RequestStore();