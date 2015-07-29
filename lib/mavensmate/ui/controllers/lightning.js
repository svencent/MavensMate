/**
 * @file Controller for the lightning metadata creation UIs
 * @author Joseph Ferraro <@joeferraro>
 */

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
    res.render('lightning/new_app.html', {
      title: 'New Lightning App'
    });
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
    res.render('lightning/new_component.html', {
      title: 'New Lightning Component'
    });
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
    res.render('lightning/new_event.html', {
      title: 'New Lightning Event'
    });
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
    res.render('lightning/new_interface.html', {
      title: 'New Lightning Interface'
    });
  }
};

/**
 * create a new lightning app
 * POST (async)
 */
LightningController.prototype.createApp = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-app', req.body)
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
 * create a new lightning component
 * POST (async)
 */
LightningController.prototype.createComponent = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-component', req.body)
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
 * create a new lightning event
 * POST (async)
 */
LightningController.prototype.createEvent = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-event', req.body)
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
 * create a new lightning interface
 * POST (async)
 */
LightningController.prototype.createInterface = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-lightning-interface', req.body)
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

module.exports = LightningController;