/**
 * @file Controller for the deploy UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var jobQueue = require('../../job-queue');
var logger = require('winston');

var DeployController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

/**
 * GET
 */
DeployController.prototype.new = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    self.client.executeCommandForProject(req.project, 'get-connections')
      .then(function(response) {
        res.render('deploy/index.html', {
          connections: response,
          hasIndexedMetadata: req.project.hasIndexedMetadata()
        });
      })
      .catch(function(err) {
        logger.error(err);
        res.status(500).send({ error: err.message });
      });
  }
};

/**
 * POST (async)
 */
DeployController.prototype.execute = function(req, res) {
  var jobId = jobQueue.addJob();
  var self = this;
  this.client.executeCommandForProject(req.project, 'deploy', req.body)
    .then(function(response) {
      var resultHtml = self.swig.renderFile('ui/templates/deploy/result.html', {
        results: response,
        targets: req.body.destinations,
        deployOptions: req.body.deployOptions,
        project: req.project
      });
      var result = {
        html: resultHtml,
        object: response
      };
      jobQueue.finish(jobId, null, result);  
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
DeployController.prototype.getConnections = function(req, res) {
  this.client.executeCommandForProject(req.project, 'get-connections')
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
DeployController.prototype.newConnection = function(req, res) {
  this.client.executeCommandForProject(req.project, 'new-connection', req.body)
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
DeployController.prototype.deleteConnection = function(req, res) {
  this.client.executeCommandForProject(req.project, 'delete-connection', req.body)
    .then(function(response) {
      res.send(response); 
    })
    .catch(function(err) {
      res.status(500).send({ error: err.message });
    });
};

module.exports = DeployController;