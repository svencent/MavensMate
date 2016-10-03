/**
 * @file Controller for the deploy UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var logger          = require('winston');
var requestStore    = require('../lib/request-store');
var querystring     = require('querystring');
var util            = require('../lib/util');

router.get('/new', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  commandExecutor.execute({
    project: req.project,
    name: 'get-connections',
    editor: req.editor
  })
  .then(function(response) {
    res.render('connections/index.html', {
      connections: response,
      title: 'Deployment Connections'
    });
  })
  .catch(function(err) {
    logger.error(err);
    res.render('error', { error: 'Error: '+err.message });
  });
});

router.get('/', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  commandExecutor.execute({
    project: req.project,
    name: 'get-connections',
    editor: req.editor
  })
  .then(function(response) {
    res.send(response);
  })
  .catch(function(err) {
    res.status(500).send({ error: err.message });
  });
});

router.post('/', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  commandExecutor.execute({
    project: req.project,
    name: 'new-connection',
    body: req.body,
    editor: req.editor
  })
  .then(function(response) {
    res.send(response);
  })
  .catch(function(err) {
    res.status(500).send({ error: err.message });
  });
});

router.post('/auth', function(req, res) {
  var params = {
    title: 'New Deployment Connection',
    callback: '/app/connections/auth/finish',
    param1: req.body.name,
    pid: req.body.pid
  };
  res.redirect('/app/auth/new?'+querystring.stringify(params));
});

router.get('/auth/finish', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  logger.debug('finishing auth in org connections: ', req.query);
  var state = JSON.parse(req.query.state);
  logger.debug('state!', state);
  var pid = state.pid;
  var project = util.getProjectById(req.app, pid);
  commandExecutor.execute({
    project: project,
    name: 'new-connection',
    body: {
      name: state.param1,
      accessToken: req.query.access_token,
      instanceUrl: req.query.instance_url,
      refreshToken: req.query.refresh_token
    }
  })
  .then(function(response) {
    res.redirect('/app/connections/new?pid='+pid);
  })
  .catch(function(err) {
    res.status(500).send({ error: err.message });
  });
});

router.delete('/:id', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  commandExecutor.execute({
    project: req.project,
    name: 'delete-connection',
    body: req.body,
    editor: req.editor
  })
  .then(function(response) {
    res.send(response);
  })
  .catch(function(err) {
    res.status(500).send({ error: err.message });
  });
});


module.exports = router;