/**
 * @file Controller for the various project UIs (new, edit)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var logger          = require('winston');
var querystring     = require('querystring');
var requestStore    = require('../lib/request-store');
var util            = require('../lib/util');
var fs              = require('fs-extra');

// create a new project
router.get('/new', function(req, res) {
  var params = {
    title: 'New Project',
    callback: '/app/project/auth/finish',
    new: '1'
  };
  res.redirect('/app/auth/new?'+querystring.stringify(params));
});

// create a new project from existing directory
router.get('/existing/new', function(req, res) {
  if (req.query.origin) {
    var params = {
      title: 'Create MavensMate Project ('+req.query.origin+')',
      callback: '/app/project/auth/finish',
      param1: req.query.origin,
      new: '1'
    };
    res.redirect('/app/auth/new?'+querystring.stringify(params));
  } else {
    res.status(500).send('Error: You must provide an existing path via the "origin" query param');
  }
});

router.get('/auth/finish', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  logger.debug('finishing auth in project: ', req.query);
  var state = JSON.parse(req.query.state);
  logger.debug('state!', state);
  var pid = state.pid;
  if (pid) {
    // updating an existing project
    var project = util.getProjectById(req.app, pid);
    project.updateCredentials({
      accessToken: req.query.access_token,
      instanceUrl: req.query.instance_url,
      refreshToken: req.query.refresh_token
    })
    .then(function(response) {
      res.redirect('/app/project/'+pid+'/edit?pid='+pid);
    })
    .catch(function(err) {
      logger.error(err);
      res.send(500);
    });
  } else if (state.param1 && fs.existsSync(state.param1)) {
    // new project from existing directory
    commandExecutor.execute({
      name: 'session',
      body: {
        accessToken: req.query.access_token,
        instanceUrl: req.query.instance_url,
        refreshToken: req.query.refresh_token
      }
    })
    .then(function(response) {
      res.render('project/new_from_existing.html', {
        title: 'Create MavensMate Project ('+state.param1+')',
        accessToken: req.query.access_token,
        instanceUrl: req.query.instance_url,
        refreshToken: req.query.refresh_token,
        session: response,
        origin: state.param1
      });
    })
    .catch(function(err) {
      logger.error('Could not initiate session', err);
    });
  } else {
    // new project
    commandExecutor.execute({
      name: 'session',
      body: {
        accessToken: req.query.access_token,
        instanceUrl: req.query.instance_url,
        refreshToken: req.query.refresh_token
      }
    })
    .then(function(response) {
      logger.debug('got new session!');
      logger.debug(response);
      res.render('project/new.html', {
        title: 'New Project',
        accessToken: req.query.access_token,
        instanceUrl: req.query.instance_url,
        refreshToken: req.query.refresh_token,
        session: response
      });
    })
    .catch(function(err) {
      logger.error('Could not initiate session', err);
    });
  }
});

// creates a new project
router.post('/', function(req, res) {
  logger.debug('received request to create new project: ');
  logger.debug(req.body);
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    name: 'new-project',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

// creates a new project from an existing directory
router.post('/existing', function(req, res) {
  logger.debug('received request to create new project frome existing directory: ');
  logger.debug(req.body);
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    name: 'new-project-from-existing-directory',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

// project landing page
router.get('/:id', function(req, res) {
  res.render('home/index.html', {
    title: 'Home'
  });
});

// usually called when project credentials are invalid
router.get('/:id/auth', function(req, res) {
  var params = {
    title: 'Update Project Credentials',
    callback: '/app/project/auth/finish',
    pid: req.project.settings.id,
    update: '1'
  };
  res.redirect('/app/auth/new?'+querystring.stringify(params));
});

// edit project UI
router.get('/:id/edit', function(req, res) {
  if (!req.project) {
    res.render('error', { error: 'Error: No project attached to this request.' });
  } else {
    res.render('project/edit.html', {
      title: 'Edit Project',
      isNewProject: req.query.new === '1'
    });
  }
});

// update an existing project
router.post('/:id', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    project: req.project,
    name: 'edit-project',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

// updates the project subscription
router.post('/:id/subscription', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  commandExecutor.execute({
    project: req.project,
    name: 'update-subscription',
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

// indexes metadata
router.post('/:id/index', function(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var request = commandExecutor.execute({
    project: req.project,
    name: 'index-metadata',
    body: req.body,
    editor: req.editor
  });
  var requestId = requestStore.add(request);
  return res.send({
    status: 'pending',
    id: requestId
  });
});

// gets metadata index for a project
router.get('/:id/index', function(req, res) {
  var commandName = req.body && req.body.packageLocation && req.body.packageLocation !== 'package.xml' ? 'get-metadata-index-for-package' : 'get-metadata-index';
  var commandExecutor = req.app.get('commandExecutor');
  commandExecutor.execute({
    project: req.project,
    name: commandName,
    body: req.body,
    editor: req.editor
  })
  .then(function(response) {
    res.send(response);
  })
  .catch(function(err) {
    res.send(err);
  });
});

module.exports = router;