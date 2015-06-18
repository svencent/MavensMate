'use strict';

var jobQueue        = require('../../job-queue');

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
    self.client.executeCommandForProject(req.project, 'get-connections', function(err, commandResult) {
      if (err) {
        res.send(err); 
      } else {
        res.render('deploy/index.html', {
          connections: commandResult.result,
          hasIndexedMetadata: req.project.hasIndexedMetadata()
        });
      }
    });
  }
};

/**
 * POST (async)
 */
DeployController.prototype.execute = function(req, res) {
  var jobId = jobQueue.addJob();
  var self = this;
  this.client.executeCommandForProject(req.project, 'deploy', req.body, function(err, commandResult) {
    if (err) {
      jobQueue.finish(jobId, err, null);  
    } else {
      // console.log(commandResult);
      var resultHtml = self.swig.renderFile('ui/templates/deploy/result.html', {
        results: commandResult.result,
        targets: req.body.destinations,
        deployOptions: req.body.deployOptions,
        project: req.project
      });
      var result = {
        html: resultHtml,
        object: commandResult.result
      };
      jobQueue.finish(jobId, null, result);  
    }
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
  this.client.executeCommandForProject(req.project, 'get-connections', function(err, commandResult) {
    if (err) {
      res.send(err); 
    } else {
      res.send(commandResult); 
    }
  });
};

/**
 * POST (sync)
 */
DeployController.prototype.newConnection = function(req, res) {
  this.client.executeCommandForProject(req.project, 'new-connection', req.body, function(err, commandResult) {
    if (err) {
      res.send(err); 
    } else {
      res.send(commandResult); 
    }
  });
};

/**
 * POST (sync)
 */
DeployController.prototype.deleteConnection = function(req, res) {
  this.client.executeCommandForProject(req.project, 'delete-connection', req.body, function(err, commandResult) {
    if (err) {
      res.send(err); 
    } else {
      res.send(commandResult); 
    }
  });
};




module.exports = DeployController;