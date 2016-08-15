/**
 * @file Controller for the deploy UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var requestStore    = require('../lib/request-store');
var logger          = require('winston');
var Deploy          = require('../lib/services/deploy');
var querystring     = require('querystring');

router.get('/new', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    var client = req.app.get('client');
    var deployDelegate = new Deploy({
      project: req.project
    });
    client.executeCommand({
      project: req.project,
      name: 'get-connections',
      editor: req.editor
    })
    .then(function(response) {
      res.render('deploy/index.html', {
        connections: response,
        namedDeployments: deployDelegate.getNamedDeployments(),
        hasIndexedMetadata: req.project.hasIndexedMetadata(),
        title: 'Deploy'
      });
    })
    .catch(function(err) {
      logger.error(err);
      res.status(500).send({ error: err.message });
    });
  }
});

router.post('/', function(req, res) {
  var client = req.app.get('client');
  var request = client.executeCommand({
    project: req.project,
    name: 'deploy',
    body: req.body,
    editor: req.editor
  })
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

module.exports = router;