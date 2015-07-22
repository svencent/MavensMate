/**
 * @file Controller for the various project UIs (new, edit)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var inherits        = require('inherits');
var logger          = require('winston');
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
  res.render('project/new.html');
};

/**
 * GET
 */
ProjectController.prototype.edit = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('project/edit.html');
  }
};

/**
 * GET
 */
ProjectController.prototype.newFromExistingDirectory = function(req, res) {
  var locals = {
    directory: req.query.directory
  };
  res.render('project/new_from_existing.html', locals);
};


/**
 * POST (async)
 */
ProjectController.prototype.create = function(req, res) {
  var jobId = jobQueue.addJob();

  logger.debug('received request to create new project: ');
  logger.debug(req.body);

  this.client.executeCommand('new-project', req.body)
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

  this.client.executeCommand('new-project-from-existing-directory', req.body)
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

  this.client.executeCommandForProject(req.project, 'edit-project', req.body)
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
ProjectController.prototype.updateCreds = function(req, res) {
  this.client.executeCommandForProject(req.project, 'update-creds', req.body)
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
ProjectController.prototype.updateSubscription = function(req, res) {
  this.client.executeCommandForProject(req.project, 'update-subscription', req.body)
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

  this.client.executeCommandForProject(req.project, 'index-metadata', req.body)
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
 * GET (sync)
 */
ProjectController.prototype.getIndex = function(req, res) {
  this.client.executeCommandForProject(req.project, 'get-metadata-index')
    .then(function(response) {
      res.send(response); 
    })
    .catch(function(err) {
      res.send(err); 
    });
};

/**
 * GET (sync)
 */
ProjectController.prototype.session = function(req, res) {
  this.client.executeCommand('session', req.query)
    .then(function(response) {
      res.send(response); 
    })
    .catch(function(err) {
      res.send(err); 
    });
};

module.exports = ProjectController;