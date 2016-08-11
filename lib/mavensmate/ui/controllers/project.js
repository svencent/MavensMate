/**
 * @file Controller for the various project UIs (new, edit)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var inherits        = require('inherits');
var logger          = require('winston');
var querystring     = require('querystring');
var jobQueue        = require('../../job-queue');
var BaseController  = require('./base');

var ProjectController = function() {
  ProjectController.super_.call(this, arguments[0]);
};

inherits(ProjectController, BaseController);

/**
 * GET
 */
ProjectController.prototype.new = function(req, res) {
  var params = {
    title: 'New Project',
    callback: '/app/project/finish-auth'
  };
  res.redirect('/app/auth/index?'+querystring.stringify(params));
};

/**
 * GET
 */
ProjectController.prototype.creds = function(req, res) {
  var params = {
    title: 'Update Project Credentials',
    callback: '/app/project/finish-auth',
    pid: req.project.settings.id
  };
  res.redirect('/app/auth/index?'+querystring.stringify(params));
};

/**
 * GET
 */
ProjectController.prototype.edit = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('project/edit.html', {
      title: 'Edit Project'
    });
  }
};

/**
 * GET
 */
ProjectController.prototype.fix = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('project/fix.html', {
      title: 'Fix Project',
      project: req.project
    });
  }
};

/**
 * GET
 */
ProjectController.prototype.newFromExistingDirectory = function(req, res) {
  var locals = {
    directory: req.query.directory,
    title: 'New Project From Existing Directory'
  };
  res.render('project/new_from_existing.html', locals);
};

/**
 * GET (sync)
 */
ProjectController.prototype.session = function(req, res) {
  this.client.executeCommand({
      name: 'session',
      body: req.query
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(function(err) {
      res.status(500).send({ error: err.message });
    });
};

/**
 * POST (sync)
 */
ProjectController.prototype.finishAuth = function(req, res) {
  logger.debug('finishing auth in project: ', req.query);
  var state = JSON.parse(req.query.state);
  logger.debug('state!', state);
  var pid = state.pid;
  if (pid) {
    // existing project
    var project = this.client.getProjectById(pid);
    project.updateCreds({
      accessToken: req.query.access_token,
      instanceUrl: req.query.instance_url,
      refreshToken: req.query.refresh_token
    })
    .then(function(response) {
      res.redirect('/app/project/edit?pid='+pid);
    })
    .catch(function(err) {
      logger.error(err);
    });
  } else {
    // new project
    this.client.executeCommand({
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
};

/**
 * POST (async)
 */
ProjectController.prototype.create = function(req, res) {
  var jobId = jobQueue.addJob();

  logger.debug('received request to create new project: ');
  logger.debug(req.body);

  this.client.executeCommand({
      name: 'new-project',
      body: req.body,
      editor: req.editor
    })
    .then(function(response) {
      jobQueue.finish(jobId, null, response);
    })
    .catch(function(err) {
      jobQueue.finish(jobId, err, null);
    });

  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * POST (async)
 */
ProjectController.prototype.createFromExisting = function(req, res) {
  var jobId = jobQueue.addJob();

  logger.debug('received request to create new project frome existing directory: ');
  logger.debug(req.body);

  this.client.executeCommand({
      name: 'new-project-from-existing-directory',
      body: req.body,
      editor: req.editor
    })
    .then(function(response) {
      jobQueue.finish(jobId, null, response);
    })
    .catch(function(err) {
      jobQueue.finish(jobId, err, null);
    });

  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * POST (async)
 */
ProjectController.prototype.update = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommand({
      project: req.project,
      name: 'edit-project',
      body: req.body,
      editor: req.editor
    })
    .then(function(response) {
      jobQueue.finish(jobId, null, response);
    })
    .catch(function(err) {
      jobQueue.finish(jobId, err, null);
    });

  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * POST (sync)
 */
ProjectController.prototype.updateSubscription = function(req, res) {
  this.client.executeCommand({
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
};

/**
 * POST (async)
 */
ProjectController.prototype.indexMetadata = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommand({
      project: req.project,
      name: 'index-metadata',
      body: req.body,
      editor: req.editor
    })
    .then(function(response) {
      jobQueue.finish(jobId, null, response);
    })
    .catch(function(err) {
      jobQueue.finish(jobId, err, null);
    });

  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * POST (sync)
 */
ProjectController.prototype.getIndex = function(req, res) {
  var commandName = req.body && req.body.packageLocation && req.body.packageLocation !== 'package.xml' ? 'get-metadata-index-for-package' : 'get-metadata-index';
  this.client.executeCommand({
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
};

module.exports = ProjectController;