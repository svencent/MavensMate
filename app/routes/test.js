/**
 * @file Controller for the apex test runner UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var express         = require('express');
var router          = express.Router();
var fs              = require('fs');
var util            = require('../lib/util');
var path            = require('path');
var requestStore    = require('../lib/request-store');
var logger          = require('winston');

router.get('/new', function(req, res) {
  if (!req.project) {
    res.render('error', { error: 'Error: No project attached to this request.' });
  } else {
    res.render('unit_test/index.html', {
      testClasses : _getTestClasses(req.project),
      title: 'Unit Test',
      className: req.query.className
    });
  }
});

router.post('/', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    project: req.project,
    name: 'run-tests',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

router.post('/coverage', function(req, res) {
  var swig = req.app.get('swig');
  var locals = {
    apexClassOrTriggerName: req.body.apexClassOrTriggerName,
    type: req.body.type,
    uncoveredLines: req.body.uncoveredLines,
    project: req.project
  };
  var resultHtml = swig.renderFile('views/unit_test/cov.html', locals);
  return res.send({
    result: resultHtml
  });
});

/**
 * Iterates project's classes directory looking for unit test classes
 * @return {Array}- Array of class names
 */
function _getTestClasses(project) {
  var self = this;
  var classes = [];
  var classPath = path.join(project.path, 'src', 'classes');

  var isTestRegEx = new RegExp(/@istest/i);
  var testMethodRegex = new RegExp(/testmethod/i);

  if (fs.existsSync(classPath)) {
    fs.readdirSync(classPath).forEach(function(filename) {
      var fileNameParts = path.basename(filename).split('.');
      var fn = fileNameParts[0];
      if(fs.lstatSync(path.join(classPath, filename)).isDirectory()){
        return;
      }
      var fileBody = util.getFileBody(path.join(classPath, filename));
      if (isTestRegEx.test(fileBody) || testMethodRegex.test(fileBody)) {
        classes.push(fn);
      }
    });
  }
  return classes;
}

module.exports = router;