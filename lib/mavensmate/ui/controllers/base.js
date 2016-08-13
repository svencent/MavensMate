/**
 * @file Base controller
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var jobQueue  = require('../../job-queue');
var index     = require('../../index');

var BaseController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

module.exports = BaseController;