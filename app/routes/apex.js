/**
 * @file Apex execute anonymous
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var requestStore    = require('../lib/request-store');

// todo: refactor errors
router.get('/', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    var client = req.app.get('client');
    client.executeCommand({
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
        res.status(500).send('Error: '+err.message);
      });
  }
});

router.post('/', function(req, res) {
  var client = req.app.get('client');
  var request = client.executeCommand({
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