/**
 * @file Controller for the execute anonyous apex UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var jobQueue = require('../../job-queue');

var ApexController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

/**
 * GET
 */
ApexController.prototype.new = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    this.client.executeCommandForProject(req.project, 'start-logging')
      .then(function() {
        res.render('execute_apex/index.html');
      })
      .catch(function(err) {
        res.status(500).send('Error: '+err.message);
      });
  }
};

/**
 * POST (async)
 */
ApexController.prototype.execute = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'execute-apex', req.body)
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


module.exports = ApexController;