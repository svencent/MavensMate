/**
 * @file HTTP Server that renders UIs and can run commands synchronously and asynchronously
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var path            = require('path');
var Promise         = require('bluebird');
var ViewHelper      = require('./helper');
var events          = require('events');
var jobQueue        = require('../job-queue');
var inherits        = require('inherits');
var util            = require('../util').instance;
var fs              = require('fs-extra');
var _               = require('lodash');
var swig            = require('swig');
var up              = require('underscore-plus');
var allowUnsafeEval = require('loophole').allowUnsafeEval;
var logger          = require('winston');

// because atom is super risk-averse
var bodyParser = allowUnsafeEval(function() {
  return require('body-parser');
});

function UIServer(client) {
  this.client = client;
}

inherits(UIServer, events.EventEmitter);

UIServer.prototype.httpServer = null;

UIServer.prototype.start = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.client.serverPort) {
      self.port = self.client.serverPort;
      self.startServer(self.port);
      process.env.MAVENSMATE_SERVER_PORT = self.port;
      return resolve(self.port);
    } else {
      self.getPort(resolve, reject);
    }
  });
};

UIServer.prototype.stop = function() {
  if (this.httpServer !== null) {
    return this.httpServer.close();
  }
};

UIServer.prototype.destroy = function() {
  if (this.httpServer !== null) {
    return this.httpServer.close();
  }
};

UIServer.prototype.getPort = function(resolve, reject) {
  var self = this;
  var portfinder = require('portfinder');
  portfinder.getPort(function (err, port) {
    if (err) {
      reject(err);
    } else {
      self.port = port;
      self.startServer(port);
      process.env.MAVENSMATE_SERVER_PORT = port;
      resolve(port);
    }
  });
};

UIServer.prototype.enableCors = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', ['Content-Type', 'X-Requested-With', 'MavensMate-Editor-Agent']);
  return next();
};

UIServer.prototype.statusRequest = function(req, res) {
  var jobId;
  var jobQueue = req.app.get('jobQueue');
  jobId = req.query.id;
  if (jobQueue.isJobComplete(jobId)) {
    res.send(jobQueue.getResultForId(jobId));
  } else {
    return res.send({
      status: 'pending',
      id: jobId
    });
  }
};

UIServer.prototype.executePostHandler = function(req, res) {
  var client = req.app.get('client');
  var command = req.body.command || req.query.command;
  if (req.query.async === '1') {
    var jobQueue = req.app.get('jobQueue');
    var jobId = jobQueue.addJob(command);
  }
  client.executeCommandForProject(req.project, command, req.body, req.editor)
    .then(function(response) {
      if (req.query.async === '1') {
        jobQueue.finish(jobId, null, response);
      } else {
        return res.send(response);
      }
    })
    .catch(function(err) {
      if (req.query.async === '1') {
        jobQueue.finish(jobId, err, null);
      } else {
        return res.send(err);        
      }
    });
  if (req.query.async === '1') {
    return res.send({
      'status': 'pending',
      'id': jobId
    });
  }
};

UIServer.prototype.executeGetHandler = function(req, res) {
  var client = req.app.get('client');
  var jobQueue = req.app.get('jobQueue');
  var jobId = jobQueue.addJob(req.query.command);

  client.executeCommandForProject(req.project, req.query.command, req.query, req.editor)
    .then(function(result) {
      jobQueue.finish(jobId, null, result);
      if (req.query.async !== '1') {
        res.send(jobQueue.getResultForId(jobId));
      }
    })
    .catch(function(err) {
      jobQueue.finish(jobId, err, null);
      if (req.query.async !== '1') {
        res.send(jobQueue.getResultForId(jobId));
      }
    });
  if (req.query.async === '1') {
    return res.send({
      'status': 'pending',
      'id': jobId
    });
  }
};

/**
 * Renders UI for requested command, e.g. localhost:8000/app/new-project
 */
UIServer.prototype.appRequestHandler = function(req, res) {
  // logger.debug('appRequestHandler');
  var controller = req.params.controller;
  var action = req.params.action || 'new';
  action = up.camelize(action);

  // we have to set the swig loader path on each request because it seems to be intermittently not persisting
  var swig = req.app.get('swig');
  swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.dirname(__dirname)) });

  var Controller = req.app.get('controllers.'+controller);
  try {
    new Controller(req)[action](req, res);    
  } catch(e) {
    console.error(e);
    res.status(404).send('Error: Could not load controller for requested route: '+e.stack);
  }
};

/**
 * Enables support for preflight requests, when needed
 */
UIServer.prototype.options = function(req, res) {
  return res.sendStatus(200);
};

UIServer.prototype.startServer = function(port) {
  var self = this;
  var app, express;
  express = allowUnsafeEval(function() {
    return require('express');
  });
  app = express();
  app.use(bodyParser.json({
    limit: '100mb'
  }));
  app.use(this.enableCors);
  app.set('client', self.client);

  app.use('/', function(req, res, next) {
    if (req.url.indexOf('/app/static') === -1) {
      logger.debug('Processing request '+req.method+' for URL: '+req.url);
    } else {
      logger.silly('Processing request '+req.method+' for URL: '+req.url);
    }
    if (req.method === 'POST' && req.body) {
      logger.debug('post body', req.body);
    } else if (req.method === 'GET' && req.query && !_.isEmpty(req.query)) {
      logger.debug('query params', req.query);
    }
    next();
  });

  app.use('/', function(req, res, next) {
    req.editor = req.query.editor || req.body.editor || req.get('MavensMate-Editor-Agent') || 'sublime';
    res.locals.editor = req.editor;

    // attach project to request based on pid query param
    if (req.query.pid) {
      var project = self.client.getProject(req.query.pid);
      if (!project) {
        self.client.addProjectById(req.query.pid)
          .then(function() {
            project = self.client.getProject(req.query.pid);
            req.project = project;
            res.locals.project = project;
            if (!project.valid) {
              logger.error('Project is not valid, redirecting to fix endpoint ...');
              res.redirect('/app/project/fix?pid='+project.settings.id);
            } else {
              next();
            }
          })
          .catch(function(err) {
            res.status(500).send('Error: Could not add project: '+err.message);
          });
      } else {
        req.project = project;
        res.locals.project = project;
        next();
      }
    } else {
      next();      
    }
  });

  var viewHelper = new ViewHelper({
    client: this.client,
    port: port
  });

  swig.setDefaults({
    runInVm: true,
    locals: {
      mavensmate : {
        ui : viewHelper
      }
    },
    loader: swig.loaders.fs(path.dirname(__dirname))
  });

  app.engine('html', swig.renderFile);
  app.set('swig', swig);
  app.set('view engine', 'html');
  app.set('views', path.join(__dirname,'templates'));
  app.set('view cache', false);

  app.set('helper', viewHelper); // TODO: do we need this?

  /**
   * Setup path for static resources
   */
  app.use('/app/static', express.static(path.join(util.getAppRoot(), 'lib', 'mavensmate', 'ui', 'resources')));

  app.set('jobQueue', jobQueue);

  /**
   * Load controllers
   */
  var controllersPath = path.join(__dirname, 'controllers');
  var controllers = {};
  fs.readdirSync(controllersPath).forEach(function(filename) {
    var baseFilename = filename.split('.')[0];
    var filepath = path.join(controllersPath,filename);
    controllers[baseFilename] = require(filepath);
  });
  _.forOwn(controllers, function(controller, baseFilename) {
    app.set('controllers.'+baseFilename, controller);
  });

  /**
   * Renders UI
   */
  app.get('/app/:controller/:action', this.appRequestHandler);
  app.post('/app/:controller/:action', this.appRequestHandler);

  /**
   * These endpoints allow a command execution to happen remotely by passing a "command" parameter
   * example: POST /execute { "command": "new-project", "username": "foo@foo.com" ... etc. }
   *
   * Asynchronous endpoints submit a request for a long running process, which will return a job id
   * The client should then poll the /status endpoint with the job id (/status?id=<job_id>)
   */

  /**
   * Synchronous command endpoints
   */
  app.options('/execute', this.options);
  app.get('/execute', this.executeGetHandler);
  app.post('/execute', this.executePostHandler);

  /**
   * Async command endpoints
   */
  app.get('/status', this.statusRequest);

  app.get('/', function(req, res) {
    res.redirect('/app/home/index');
  });

  /**
   * Start the server on the provided port
   */
  this.httpServer = require('http').createServer(app);
  this.httpServer.listen(port);
};

module.exports = UIServer;
