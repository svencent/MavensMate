/**
 * @file Controller for the apex test runner UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var fs              = require('fs');
var util            = require('../../util').instance;
var path            = require('path');
var jobQueue        = require('../../job-queue');
var logger          = require('winston');

var TestController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

/**
 * GET
 */
TestController.prototype.new = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('unit_test/index.html', {
      testClasses : self._getTestClasses(req, res)
    });
  }
};

/**
 * POST (async)
 */
TestController.prototype.execute = function(req, res) {
  var jobId = jobQueue.addJob();
  var self = this;

  logger.debug('received request to execute tests asynchronously: ');
  logger.debug(req.body);

  self.client.executeCommandForProject(req.project, 'run-tests', req.body)
    .then(function(response) {
      response.project = res.locals.project;
      var resultHtml = self.swig.renderFile('ui/templates/unit_test/result.html', response);
      jobQueue.finish(jobId, null, resultHtml);
    })
    .catch(function(err) {
      logger.error('async request finished with error');
      logger.error(err.message);
      jobQueue.finish(jobId, err, null);  
    });
  
  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * POST (sync)
 */
TestController.prototype.coverage = function(req, res) {
  var locals = {
    apexClassOrTriggerName: req.body.apexClassOrTriggerName,
    type: req.body.type,
    uncoveredLines: req.body.uncoveredLines,
    project: req.project
  };

  var resultHtml = this.swig.renderFile('ui/templates/unit_test/coverage.html', locals);
  return res.send({
    result: resultHtml
  }); 
};

/**
 * Iterates project's classes directory looking for unit test classes
 * @return {Array}- Array of class names
 */
TestController.prototype._getTestClasses = function(req, res) {
  var self = this;
  var classes = [];
  var classPath = path.join(req.project.path, 'src', 'classes');
  if (fs.existsSync(classPath)) {
    fs.readdirSync(classPath).forEach(function(filename) {
      var fileNameParts = path.basename(filename).split('.');
      var bn = fileNameParts[0];
      if (fileNameParts.length === 2) {
        if (util.startsWith(bn, 'test') || util.endsWith(bn, 'test')) {
          classes.push(bn);
        }
      }
    });
  }
  return classes;
};

module.exports = TestController;