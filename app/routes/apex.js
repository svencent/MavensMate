/**
 * @file Apex execute anonymous
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var requestStore    = require('../lib/request-store');
var logger          = require('winston');

// todo: refactor errors
router.get('/new', function(req, res) {
  if (!req.project) {
    res.render('error', { error: 'Error: No project attached to this request.' });
  } else {
    var commandExecutor = req.app.get('commandExecutor');
    commandExecutor.execute({
      name: 'start-logging',
      project: req.project,
      editor: req.editor
    })
    .then(function() {
      res.render('execute_apex/index.html', {
        title: 'Execute Apex'
      });
    })
    .catch(function(err) {
      res.render('error', { error: 'Error: '+err.message });
    });
  }
});

router.post('/', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    project: req.project,
    name: 'execute-apex',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});


module.exports = router;