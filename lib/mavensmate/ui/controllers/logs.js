/**
 * @file Controller for the logs viewer
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var jobQueue    = require('../../job-queue');
var LogService  = require('../../log');
var logger      = require('winston');

var LogsController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
  this.logService = new LogService(req.project);
};

LogsController.prototype.socket = true;

/**
 * GET
 */
LogsController.prototype.index = function(req, res, io) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    io.on('connection', function(socket) {
      req.project.on('new-log', function(filePath) {
        socket.emit('new-log', { location: filePath });
      });
    });
    res.render('logs/index.html', {
      title: 'Logs'
    });
    // this.client.executeCommandForProject(req.project, 'start-logging', null, req.editor)
    //   .then(function() {
    //     res.render('logs/index.html', {
    //       title: 'Logs'
    //     });
    //   })
    //   .catch(function(err) {
    //     res.status(500).send('Error: '+err.message);
    //   });
  }
};

/**
 * GET
 */
LogsController.prototype.getLog = function(req, res) {
  var self = this;
  var logLocation = req.query.location;
  this.logService.getLog(logLocation)
    .then(function(logLines) {
      res.status(200).send(logLines);
    })
    .catch(function(error) {
      res.status(500).send('Error: '+err.message);
    })
};

/**
 * GET
 */
LogsController.prototype.filterLog = function(req, res) {
  var self = this;
  var logLocation = req.query.location;
  var keyword = req.query.keyword;
  this.logService.filter(logLocation, keyword)
    .then(function(matchingLines) {
      res.status(200).send(matchingLines);
    })
    .catch(function(error) {
      res.status(500).send('Error: '+err.message);
    })
};

module.exports = LogsController;