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
  res.render('project/oauth_start.html', {
    title: 'New Project'
  });
};

/**
 * GET
 */
ProjectController.prototype.creds = function(req, res) {
  res.render('project/oauth_start.html', {
    title: 'Update Project Credentials',
    project: req.project
  });
};

/**
 * GET
 */
ProjectController.prototype.callback = function(req, res) {
  res.render('project/callback.html', {
    title: 'Redirecting...'
  });
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
ProjectController.prototype.startAuth = function(req, res) {
  var orgType = req.body.orgType;
  var instanceUrl = req.body.instanceUrl;
  if (!instanceUrl) {
    if (orgType === 'sandbox') {
      instanceUrl = 'https://test.salesforce.com/';
    } else {
      instanceUrl = 'https://login.salesforce.com/';
    }
  }
  var params = {
    client_id: process.env.SFDC_OAUTH_CLIENT_ID || '3MVG9uudbyLbNPZP7kLgoRiWVRqiN8gFcKwdAlztVnjgbj9shSk1vMXJNmV7W0ciFbeYiaP9D4tLfBBD06l_7',
    redirect_uri: process.env.SFDC_OAUTH_CALLBACK_URL || 'https://localhost:56248/sfdc/auth/callback',
    response_type: process.env.SFDC_OAUTH_RESPONSE_TYPE || 'token'
  };
  if (req.body.pid) {
    params.state = req.body.pid + ';' + '/app/project/edit'; // project id and destination for callback
  }
  var oauthUrl = instanceUrl+'/services/oauth2/authorize?'+querystring.stringify(params);
  logger.debug('oauth url is: ', oauthUrl);
  res.redirect(oauthUrl);
};

/**
 * POST (sync)
 */
ProjectController.prototype.finishAuth = function(req, res) {
  logger.debug('finishing auth: ', req.body.url);
  var loginInfo = querystring.parse(req.body.url.split('#')[1]);
  if (loginInfo.state) {
    // existing project
    var stateParts = loginInfo.state.split(';');
    var pid = stateParts[0];
    var destination = stateParts[1];
    var project = this.client.getProjectById(pid);
    project.updateCreds({
      accessToken: loginInfo.access_token,
      instanceUrl: loginInfo.instance_url,
      refreshToken: loginInfo.refresh_token
    })
    .then(function(response) {
      res.redirect(destination+'?pid='+pid);
    })
    .catch(function(err) {
      logger.error(err);
    });
  } else {
    // new project
    this.client.executeCommand({
      name: 'session',
      body: {
        accessToken: loginInfo.access_token,
        instanceUrl: loginInfo.instance_url,
        refreshToken: loginInfo.refresh_token
      }
    })
    .then(function(response) {
      logger.debug('got new session!');
      logger.debug(response);
      res.render('project/new.html', {
        title: 'New Project',
        accessToken: loginInfo.access_token,
        instanceUrl: loginInfo.instance_url,
        refreshToken: loginInfo.refresh_token,
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