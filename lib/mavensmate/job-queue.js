/**
 * @file Tracks async requests submitted to the server
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _         = require('underscore-plus');
var uuid      = require('node-uuid');
var events    = require('events');
var inherits  = require('inherits');
var logger    = require('winston');

var JobQueue = function(){};

inherits(JobQueue, events.EventEmitter);

JobQueue.prototype.tracked = {};

JobQueue.prototype.addJob = function(operation) {
  var job, jobId;
  jobId = uuid.v1();
  job = {
    id: jobId,
    complete: false,
    operation: operation
  };
  this.tracked[jobId] = job;
  return jobId;
};

JobQueue.prototype.start = function(jobId, job) {
  return this.tracked[jobId].work = job.then(this.finish);
};

JobQueue.prototype.isJobComplete = function(jobId) {
  return this.tracked[jobId].complete;
};

JobQueue.prototype.getResultForId = function(jobId) {
  var p = _.clone(this.tracked[jobId]);
  delete this.tracked[jobId];
  return p;
};

/**
 * TODO: we're doing a lot of gymnastics with the error/result objects, need to standardize with command.js's respond
 * @param  {String} jobId  - id of the job to finish
 * @param  {Object} error  - should be an error object, but see TODO
 * @param  {Object} result - result object, typically formatted like { response: {  } }
 * @return {Nothing}        
 */
JobQueue.prototype.finish = function(jobId, error, result) {
  logger.debug('finishing jobid: '+jobId);
  if (error) {
    logger.error(error);
  } else if (result) {
    logger.silly(result);
  }
  if (error && error instanceof Error) {
    this.tracked[jobId].error = error.message;
    this.tracked[jobId].stack = error.stack;
  } else if (result) {
    this.tracked[jobId].result = result;
  } else {
    throw new Error('Could not finish job '+jobId);
  }
  this.tracked[jobId].complete = true;
};

module.exports = new JobQueue();