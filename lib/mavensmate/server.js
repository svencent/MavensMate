'use strict';

var events          = require('events');
var logger          = require('winston');
var tracker         = require('./tracker');
var inherits        = require('inherits');
var allowUnsafeEval = require('loophole').allowUnsafeEval;
var bodyParser      = allowUnsafeEval(function() {
  return require('body-parser');
});

function UIServer(client) {
  this.port = '19227';
  this.client = client;
  this.startServer(this.port);
}

inherits(UIServer, events.EventEmitter);

UIServer.prototype.httpServer = null;

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

UIServer.prototype.enableCors = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', ['Content-Type', 'X-Requested-With', 'mm_plugin_client']);
  return next();
};

UIServer.prototype.statusRequest = function(req, res) {
  var promiseId;
  tracker = req.app.get('tracker');
  promiseId = req.query.id;
  if (tracker.isPromiseComplete(promiseId)) {
    res.send(tracker.pop(promiseId).result);
    return this.emit('mavensmate:promise-completed', promiseId);
  } else {
    return res.send({
      'status': 'pending',
      'id': promiseId
    });
  }
};

UIServer.prototype.synchronousPostRequestHandler = function(req, res) {
  var params;
  var self = this;
  var client = req.app.get('client');
  params = {
    payload: req.body
  };
  return client.executeCommand(params).then(function(result) {
    res.send(result);
    tracker.pop(result.promiseId).result;
    self.emit('mavensmate:promise-completed', result.promiseId);
  });
};

UIServer.prototype.synchronousGetRequestHandler = function(req, res) {
  var params;
  var client = req.app.get('client');
  params = {
    payload: req.query
  };
  return client.executeCommand(params).then(function(result) {
    res.send(result);
    tracker.pop(result.promiseId).result;
    emitter.emit('mavensmate:promise-completed', result.promiseId);
    return emitter.emit('mavensmate:panel-notify-finish', params, result, result.promiseId);
  });
};

UIServer.prototype.asynchronousPostRequestHandler = function(req, res) {
  var params, promiseId;
  tracker = req.app.get('tracker');
  var client = req.app.get('client');
  promiseId = tracker.enqueuePromise();
  params = {
    payload: req.body,
    promiseId: promiseId
  };
  client.executeCommand(params).then(function(result) {
    emitter.emit('mavensmate:promise-completed', result.promiseId);
    return emitter.emit('mavensmate:panel-notify-finish', params, result, result.promiseId);
  });
  return res.send({
    'status': 'pending',
    'id': promiseId
  });
};

UIServer.prototype.asynchronousGetRequestHandler = function(req, res) {
  var params, promiseId;
  tracker = req.app.get('tracker');
  mm = req.app.get('mm');
  promiseId = tracker.enqueuePromise();
  params = {
    payload: req.query,
    promiseId: promiseId
  };
  mm.run(params).then(function(result) {
    emitter.emit('mavensmate:promise-completed', result.promiseId);
    return emitter.emit('mavensmate:panel-notify-finish', params, result, result.promiseId);
  });
  return res.send({
    'status': 'pending',
    'id': promiseId
  });
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
  
  app.set('tracker', this.promiseTracker);
  app.set('client', this.client);
  
  app.get('/status', this.statusRequest);
  
  app.options('/generic', this.options);
  app.options('/generic/async', this.options);
  
  app.post('/generic/async', this.asynchronousPostRequestHandler);
  app.get('/generic/async', this.asynchronousGetRequestHandler);
  
  app.post('/generic', this.synchronousPostRequestHandler);
  app.get('/generic', this.synchronousGetRequestHandler);
  
  this.httpServer = require('http').createServer(app);
  this.httpServer.listen(port);
  logger.debug('express.js listening on port: ' + port);
};

module.exports = UIServer;