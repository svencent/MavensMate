/**
 * @file Controller for the deploy UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var requestStore    = require('../lib/request-store');
var logger          = require('winston');
var deployUtil      = require('../lib/deploy/util');

router.get('/new', function(req, res) {
  if (!req.project) {
    res.render('error', { error: 'Error: No project attached to this request.' });
  } else {
    var commandExecutor = req.app.get('commandExecutor');
    var deployDelegate = new Deploy({
      project: req.project
    });
    commandExecutor.execute({
      project: req.project,
      name: 'get-connections',
      editor: req.editor
    })
    .then(function(response) {
      res.render('deploy/index.html', {
        connections: response,
        namedDeployments: deployUtil.getNamedDeployments(),
        hasIndexedMetadata: req.project.serverStore.hasIndex(),
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
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
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