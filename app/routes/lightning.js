'use strict';

var express           = require('express');
var router            = express.Router();
var requestStore      = require('../lib/request-store');
var LightningService  = require('../lib/services/lightning');

router.get('/application/new', function(req, res) {
  res.render('lightning/new.html', {
    title: 'Create Lightning Application',
    lightningType: 'application'
  });
});

router.get('/component/new', function(req, res) {
  res.render('lightning/new.html', {
    title: 'Create Lightning Component',
    lightningType: 'component'
  });
});

router.get('/event/new', function(req, res) {
  res.render('lightning/new.html', {
    title: 'Create Lightning Event',
    lightningType: 'event'
  });
});

router.get('/interface/new', function(req, res) {
  res.render('lightning/new.html', {
    title: 'Create Lightning Interface',
    lightningType: 'interface'
  });
});

router.get('/tokens/new', function(req, res) {
  res.render('lightning/new.html', {
    title: 'Create Lightning Tokens',
    lightningType: 'tokens'
  });
});

router.get('/bundles', function(req, res) {
  var lightningService = new LightningService(req.project);
  lightningService.getBundles()
    .then(function(bundles) {
      res.render('lightning/index.html', {
        title: 'Lightning Bundles',
        bundles: bundles.records
      });
    })
    .catch(function(err) {
      res.status(500).send(err.message);
    });
});

router.delete('/bundles/:bundleId', function(req, res) {
  var lightningService = new LightningService(req.project);
  // lightningService.delete()
});

router.get('/bundles/:bundleId', function(req, res) {
  var lightningService = new LightningService(req.project);
  Promise.all([
    lightningService.getBundle(req.params.bundleId),
    lightningService.getBundleItems(req.params.bundleId)
  ])
  .then(function(results) {
    var bundle = results[0].records[0];
    var bundleItems = results[1].records;
    res.render('lightning/edit.html', {
      title: bundle.MasterLabel,
      bundleItems: bundleItems,
      bundle: bundle
    });
  })
  .catch(function(err) {
    res.status(500).send(err.message);
  });
});

router.post('/bundles/:bundleId', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    project: req.project,
    name: 'new-lightning-bundle-item',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

router.post('/bundles', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    project: req.project,
    name: 'new-lightning-bundle',
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