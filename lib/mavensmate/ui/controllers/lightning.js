'use strict';

var jobQueue = require('../../job-queue');

var LightningController = function(req) {
  this.client = req.app.get('client');
};

/**
 * GET (sync)
 */
LightningController.prototype.new = function(req, res) {
  res.render('lightning/index.html');
};

/**
 * POST (async)
 */
LightningController.prototype.create = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommand('new-lightning-bundle', req.body, function(err, commandResult) {
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