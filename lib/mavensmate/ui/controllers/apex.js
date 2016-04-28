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
    this.client.executeCommand({
        name: 'start-logging',
        project: req.project,
        editor: req.editor
      })
      .then(function() {
        res.render('execute_apex/index.html', {
          title: 'Execute Apex'
        });
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

  this.client.executeCommand({
      project: req.project,
      name: 'execute-apex',
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


module.exports = ApexController;