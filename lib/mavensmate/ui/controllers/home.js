'use strict';

var fs              = require('fs');
var util            = require('../../util').instance;
var path            = require('path');
var jobQueue        = require('../../job-queue');
var logger          = require('winston');

var TestController = function(req) {
  this.client = req.app.get('clients')[req.params.pid];
  this.swig = req.app.get('swig');
};

/**
 * GET
 */
TestController.prototype.index = function(req, res) {
  res.render('home/index.html');
};

module.exports = TestController;