'use strict';

var jobQueue        = require('../../job-queue');
var logger          = require('winston');

var ProjectController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

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
 * POST (async)
 */
ProjectController.prototype.create = function(req, res) {
  var jobId = jobQueue.addJob();

  logger.debug('received request to execute tests asynchronously: ');
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
      res.send(err); 
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
      res.send(err); 
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