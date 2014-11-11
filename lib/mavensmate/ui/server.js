'use strict';

var path            = require('path');
var Q               = require('q');
var Renderer        = require('./renderer');
var events          = require('events');
var logger          = require('winston');
var promiseTracker  = require('../tracker');
var inherits        = require('inherits');
var allowUnsafeEval = require('loophole').allowUnsafeEval;
var util            = require('../util').instance;
var bodyParser      = allowUnsafeEval(function() {
  return require('body-parser');
});

function UIServer(client) {
  this.client = client;
}

inherits(UIServer, events.EventEmitter);

UIServer.prototype.httpServer = null;

UIServer.prototype.start = function() {
  var deferred = Q.defer();
  this.getPort(deferred);
  return deferred.promise;
};

UIServer.prototype.stop = function() {
  logger.debug('stopping server running on: '+this.port);
  if (this.httpServer !== null) {
    return this.httpServer.close();
  }
};

UIServer.prototype.destroy = function() {
  if (this.httpServer !== null) {
    return this.httpServer.close();
  }
};

UIServer.prototype.getPort = function(deferred) {
  var self = this;
  var portfinder = require('portfinder');
  portfinder.getPort(function (err, port) {
    if (err) {
      deferred.reject(err);
    } else {
      self.port = port;
      self.startServer(port);
      deferred.resolve(port);
    }
  });
};

UIServer.prototype.enableCors = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', ['Content-Type', 'X-Requested-With', 'mm_plugin_client']);
  return next();
};

UIServer.prototype.statusRequest = function(req, res) {
  var promiseId;
  var tracker = req.app.get('tracker');
  promiseId = req.query.id;
  if (tracker.isPromiseComplete(promiseId)) {
    res.send(tracker.pop(promiseId));
  } else {
    return res.send({
      'status': 'pending',
      'id': promiseId
    });
  }
};

UIServer.prototype.executeSyncPostHandler = function(req, res) {
  var client = req.app.get('client');
  client.executeCommand(req.body.command, req.body, function(err, response) {
    if (err) {
      logger.debug('sync post request finished with error');
      logger.debug(err.message);
      return res.send(err);
    } else {
      logger.debug('sync post request finished successfully');
      logger.debug(response);
      return res.send(response);
    }
  });
};

UIServer.prototype.executeSyncGetHandler = function(req, res) {
  var tracker = req.app.get('tracker');
  var client = req.app.get('client');
  var promiseId = tracker.enqueuePromise();

  logger.debug('received request to handle sync get request: ');
  logger.debug(req.query);

  client.executeCommand(req.query.command, req.query, function(err, result) {
    if (err) {
      logger.debug('sync request finished with error');
      logger.debug(err.message);
      tracker.completePromise(promiseId, err, null);  
      res.send(tracker.pop(promiseId));
    } else {
      logger.debug('sync request finished successfully');
      logger.debug(result);
      tracker.completePromise(promiseId, null, result);  
      res.send(tracker.pop(promiseId));
    }
  });
};

UIServer.prototype.executeAsyncPostHandler = function(req, res) {
  var tracker = req.app.get('tracker');
  var client = req.app.get('client');
  var promiseId = tracker.enqueuePromise();

  logger.debug('received request to handle async post request: ');
  logger.debug(req.body);

  client.executeCommand(req.body.command, req.body, function(err, res) {
    if (err) {
      logger.debug('async request finished with error');
      logger.debug(err.message);
      tracker.completePromise(promiseId, err, null);  
    } else {
      logger.debug('async request finished successfully');
      logger.debug(res);
      tracker.completePromise(promiseId, null, res);  
    }
  });
  return res.send({
    'status': 'pending',
    'id': promiseId
  });
};

UIServer.prototype.executeAsyncGetHandler = function(req, res) {
  var tracker = req.app.get('tracker');
  var client = req.app.get('client');
  var promiseId = tracker.enqueuePromise();

  logger.debug('received request to handle async get request: ');
  logger.debug(req.body);

  client.executeCommand(req.query.command, req.query, function(err, res) {
    if (err) {
      logger.debug('async request finished with error');
      logger.debug(err.message);
      tracker.completePromise(promiseId, err, null);  
    } else {
      logger.debug('async request finished successfully');
      logger.debug(res);
      tracker.completePromise(promiseId, null, res);  
    }
  });
  return res.send({
    'status': 'pending',
    'id': promiseId
  });
};

/**
 * Renders UI for requested command, e.g. localhost:8000/app/new-project
 */
UIServer.prototype.commandUiHandler = function(req, res) {
  var command = req.params.command;
  var renderer = req.app.get('renderer');
  logger.debug('rendering template for: '+command);
  renderer.render(command, false)
    .then(function(html){
      return res.send(html);
    })
    ['catch'](function(error) {
      return res.send('<h1>Could not generate UI for the requested command</h1><h4>'+error.message+'</h4>');
    })
    .done();
};

UIServer.prototype.options = function(req, res) {
  return res.send(200);
};

UIServer.prototype.startServer = function(port) {
  var app, express;
  express = allowUnsafeEval(function() {
    return require('express');
  });
  app = express();
  app.use(bodyParser.json());
  app.use(this.enableCors);
  app.use('/app/static', express.static(path.join(util.getAppRoot(), 'lib', 'mavensmate', 'ui', 'resources')));
  
  var client = this.client;
  var renderer = new Renderer({
    client: client,
    port: port
  });

  app.set('tracker', promiseTracker);
  app.set('client', this.client);
  app.set('renderer', renderer);
  
  app.get('/status', this.statusRequest);
  
  app.options('/execute', this.options);
  app.options('/execute/async', this.options);
  
  app.post('/execute/async', this.executeAsyncPostHandler);
  app.get('/execute/async', this.executeAsyncGetHandler);
  
  app.post('/execute', this.executeSyncPostHandler);
  app.get('/execute', this.executeSyncGetHandler);

  app.get('/app/:command', this.commandUiHandler);
  
  this.httpServer = require('http').createServer(app);
  this.httpServer.listen(port);
  logger.debug('express.js listening on port: ' + port);
};

module.exports = UIServer;