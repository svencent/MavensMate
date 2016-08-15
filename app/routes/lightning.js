'use strict';

var express         = require('express');
var router          = express.Router();
var requestStore    = require('../lib/request-store');

router.get('/app/new', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_app.html', {
      title: 'New Lightning App'
    });
  }
});

router.get('/component/new', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_component.html', {
      title: 'New Lightning Component'
    });
  }
});

router.get('/event/new', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_event.html', {
      title: 'New Lightning Event'
    });
  }
});

router.get('/interface/new', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_interface.html', {
      title: 'New Lightning Interface'
    });
  }
});

router.post('/app', function(req, res) {
  var client = req.app.get('client');
  var requestId = client.executeCommand({
    project: req.project,
    name: 'new-lightning-app',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

router.post('/component', function(req, res) {
  var client = req.app.get('client');
  var requestId = client.executeCommand({
    project: req.project,
    name: 'new-lightning-component',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

router.post('/event', function(req, res) {
  var client = req.app.get('client');
  var requestId = client.executeCommand({
    project: req.project,
    name: 'new-lightning-event',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

router.post('/interface', function(req, res) {
  var client = req.app.get('client');
  var requestId = client.executeCommand({
    project: req.project,
    name: 'new-lightning-interface',
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