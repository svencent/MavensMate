'use strict';

var Q         = require('q');
var _         = require('lodash');
var inherits  = require('inherits');

// function Promise() {
//   Promise.super_.apply(this, arguments);
// }

// inherits(Promise, Q);

Q.prototype.thenCall = function(callback) {
  if (_.isFunction(callback)) {
    this.then(function(res) {
      process.nextTick(function() {
        callback(null, res);
      });
    }, function(err) {
      process.nextTick(function() {
        callback(err);
      });
    });
  }
  return this;
};

module.exports = Q;