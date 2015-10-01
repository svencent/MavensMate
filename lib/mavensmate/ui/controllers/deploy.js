/**
 * @file Controller for the deploy UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var logger    = require('winston');
var jobQueue  = require('../../job-queue');
var Deploy    = require('../../deploy');

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
    var deployDelegate = new Deploy({
      project: req.project
    });
    self.client.executeCommandForProject(req.project, 'get-connections', null, req.editor)
      .then(function(response) {
        res.render('deploy/index.html', {
          connections: response,
          namedDeployments: deployDelegate.getNamedDeployments(),
          hasIndexedMetadata: req.project.hasIndexedMetadata(),
          title: 'Deploy'
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
  this.client.executeCommandForProject(req.project, 'deploy', req.body, req.editor)
    .then(function(response) {
      var resultHtml = self.swig.renderFile('ui/templates/deploy/result.html', {
        results: response,
        usernames: req.body.usernames,
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
  this.client.executeCommandForProject(req.project, 'get-connections', null, req.editor)
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
  this.client.executeCommandForProject(req.project, 'new-connection', req.body, req.editor)
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
  this.client.executeCommandForProject(req.project, 'delete-connection', req.body, req.editor)
    .then(function(response) {
      res.send(response); 
    })
    .catch(function(err) {
      res.status(500).send({ error: err.message });
    });
};

module.exports = DeployController;