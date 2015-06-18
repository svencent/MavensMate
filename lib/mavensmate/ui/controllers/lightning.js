'use strict';

var jobQueue = require('../../job-queue');

var LightningController = function(req) {
  this.client = req.app.get('client');
};

/**
 * GET (sync)
 */
LightningController.prototype.newApp = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_app.html');
  }
};

/**
 * GET (sync)
 */
LightningController.prototype.newComponent = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_component.html');
  }
};

/**
 * GET (sync)
 */
LightningController.prototype.newEvent = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_event.html');
  }
};

/**
 * GET (sync)
 */
LightningController.prototype.newInterface = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    res.render('lightning/new_interface.html');
  }
};

/**
 * create a new lightning app
 * POST (async)
 */
LightningController.prototype.createApp = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-app', req.body, function(err, commandResult) {
    if (err) {
      jobQueue.finish(jobId, err, null);  
    } else {
      jobQueue.finish(jobId, null, commandResult);  
    }
  });
  
  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * create a new lightning component
 * POST (async)
 */
LightningController.prototype.createComponent = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-component', req.body, function(err, commandResult) {
    if (err) {
      jobQueue.finish(jobId, err, null);  
    } else {
      jobQueue.finish(jobId, null, commandResult);  
    }
  });
  
  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * create a new lightning event
 * POST (async)
 */
LightningController.prototype.createEvent = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-event', req.body, function(err, commandResult) {
    if (err) {
      jobQueue.finish(jobId, err, null);  
    } else {
      jobQueue.finish(jobId, null, commandResult);  
    }
  });
  
  return res.send({
    status: 'pending',
    id: jobId
  });
};

/**
 * create a new lightning interface
 * POST (async)
 */
LightningController.prototype.createInterface = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-interface', req.body, function(err, commandResult) {
    if (err) {
      jobQueue.finish(jobId, err, null);  
    } else {
      jobQueue.finish(jobId, null, commandResult);  
    }
  });
  
  return res.send({
    status: 'pending',
    id: jobId
  });
};

module.exports = LightningController;