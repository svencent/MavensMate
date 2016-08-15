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

// create a new project
router.get('/new', function(req, res) {
  var params = {
    title: 'New Project',
    callback: '/app/project/auth/finish'
  };
  res.redirect('/app/auth/new?'+querystring.stringify(params));
});

router.get('/auth/finish', function(req, res) {
  var client = req.app.get('client');
  logger.debug('finishing auth in project: ', req.query);
  var state = JSON.parse(req.query.state);
  logger.debug('state!', state);
  var pid = state.pid;
  if (pid) {
    // updating an existing project
    var project = client.getProjectById(pid);
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
    });
  } else {
    // new project
    client.executeCommand({
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
  var client = req.app.get('client');
  var request = client.executeCommand({
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
    pid: req.project.settings.id
  };
  res.redirect('/app/auth/new?'+querystring.stringify(params));
});

// edit project UI
router.get('/:id/edit', function(req, res) {
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('project/edit.html', {
      title: 'Edit Project'
    });
  }
});

// update an existing project
router.post('/:id', function(req, res) {
  var client = req.app.get('client');
  var request = client.executeCommand({
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
  var client = req.app.get('client');
  client.executeCommand({
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
  var client = req.app.get('client');
  var request = client.executeCommand({
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
  var client = req.app.get('client');
  client.executeCommand({
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

// // todo: standardize endpojint
// ProjectController.prototype.createFromExisting = function(req, res) {
//   var requestId = requestStore.add();

//   logger.debug('received request to create new project frome existing directory: ');
//   logger.debug(req.body);

//   client.executeCommand({
//       name: 'new-project-from-existing-directory',
//       body: req.body,
//       editor: req.editor
//     })
//     .then(function(response) {
//       requestStore.finish(requestId, null, response);
//     })
//     .catch(function(err) {
//       requestStore.finish(requestId, err, null);
//     });

//   return res.send({
//     status: 'pending',
//     id: requestId
//   });
// };

module.exports = router;