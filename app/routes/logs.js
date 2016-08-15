/**
 * @file Controller for the logs viewer
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var express         = require('express');
var router          = express.Router();
var requestStore    = require('../lib/request-store');
var path            = require('path');
var logger          = require('winston');

router.get('/', function(req, res) {
  var io = req.app.get('io')
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    io.on('connection', function(socket) {
      req.project.on('new-log', function(filePath) {
        socket.emit('new-log', {
          location: filePath,
          locationBasename: path.basename(filePath)
        });
      });
    });
    req.project.logService.getLogs()
      .then(function(logs) {
        res.render('logs/index.html', {
          title: 'Logs',
          logs: logs
        });
      });
  }
});

router.get('/:location', function(req, res) {
  var logLocation = req.params.location;
  req.project.logService.getLog(path.join(req.project.path, 'debug', 'logs', logLocation))
    .then(function(logLines) {
      var resultHtml = req.app.get('swig').renderFile('views/logs/log.html', {
        lines: logLines
      });
      res.status(200).send(resultHtml);
    })
    .catch(function(err) {
      res.status(500).send('Error: '+err.message);
    })
});

router.post('/:location', function(req, res) {
  var logLocation = req.params.location;
  var keyword = req.query.keyword;
  req.project.logService.filter(path.join(req.project.path, 'debug', 'logs', logLocation), keyword)
    .then(function(matchingLines) {
      var resultHtml = req.app.get('swig').renderFile('views/logs/log.html', {
        lines: matchingLines
      });
      res.status(200).send(resultHtml);
    })
    .catch(function(err) {
      res.status(500).send('Error: '+err.message);
    })
});

module.exports = router;