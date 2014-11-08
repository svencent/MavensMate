'use strict';

var PromiseTracker, emitter, tracker, uuid, _, events, inherits;

_         = require('underscore-plus');
uuid      = require('node-uuid');
events    = require('events');
inherits  = require('inherits');

function PromiseTracker() {}

inherits(PromiseTracker, events.EventEmitter);

PromiseTracker.prototype.tracked = {};

PromiseTracker.prototype.enqueuePromise = function(operation) {
  var promise, promiseId;
  this.emit('mavensmate:promise-enqueued');
  promiseId = uuid.v1();
  promise = {
    id: promiseId,
    complete: false,
    operation: operation
  };
  this.tracked[promiseId] = promise;
  return promiseId;
};

PromiseTracker.prototype.hasPendingOperation = function(operation) {
  var self = this;
  console.debug('is there a pending operation for: ' + operation);
  _.each(_.keys(self.tracked), function(promiseId) {
    var tracked;
    tracked = self.tracked[promiseId];
    console.debug('TRACKED: ' + tracked);
    if (tracked.operation === operation) {
      return true;
    }
  });
  return false;
};

PromiseTracker.prototype.start = function(promiseId, promise) {
  this.emit('mavensmate:promise-started', promiseId, promise);
  return this.tracked[promiseId].work = promise.then(this.completePromise);
};

PromiseTracker.prototype.isPromiseComplete = function(promiseId) {
  return this.tracked[promiseId].complete;
};

PromiseTracker.prototype.pop = function(promiseId, pop) {
  var p;
  if (pop === null) {
    pop = true;
  }
  if (pop) {
    p = _.clone(this.tracked[promiseId]);
    delete this.tracked[promiseId];
    return p;
  } else {
    return this.tracked[promiseId];
  }
};

PromiseTracker.prototype.completePromise = function(promiseId, error, result) {
  console.log('completing!!!');
  console.log(promiseId);
  console.log(error);
  console.log(result);
  if (result && result.result) {
    this.tracked[promiseId].result = result.result; // TODO: wacky
  }
  if (error) {
    this.tracked[promiseId].error = error.message;
    this.tracked[promiseId].stack = error.stack;
  }
  this.tracked[promiseId].complete = true;
};


tracker = new PromiseTracker();

module.exports = tracker;
