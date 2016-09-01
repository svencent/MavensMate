/**
 * @file HTTP Server that renders UIs and can run commands synchronously and asynchronously
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _                 = require('lodash');
var path              = require('path');
var swig              = require('swig');
var express           = require('express');
var bodyParser        = require('body-parser');
var config            = require('./config');
var logger            = require('./lib/logger')();
var EditorService     = require('./lib/services/editor');
var ViewHelper        = require('./helper');
var requestStore      = require('./lib/request-store');
var util              = require('./lib/util');
var app, server;

/**
 * Starts the MavensMate HTTP server
 * @param  {Object} opts - server options
 * @param  {Integer} opts.port - server port
 * @param  {String} opts.mode - when running in MavensMate-Desktop, this value is "desktop"
 * @param  {Function} opts.openWindowFn - function used to open windows (optional)
 * @return {Object} - express app
 */
module.exports.start = function(opts) {
  opts = opts || {};

  if (!config.get('mm_workspace') || (_.isArray(config.get('mm_workspace')) && config.get('mm_workspace').length === 0)) {
    config.set('mm_workspace', [ util.getDefaultWorkspaceSetting() ]);
    config.save();
  }

  app = express();

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ limit: '100mb' }));

  app.use(require('./middleware/cors'));
  app.use(require('./middleware/logging'));
  app.use(require('./middleware/editor'));
  app.use(require('./middleware/project'));
  app.use(require('./middleware/swig'));

  var viewHelper = new ViewHelper({
    port: opts.port,
    supportedEditors: new EditorService().supportedEditors
  });

  swig.setDefaults({
    runInVm: true,
    locals: {
      mavensmate : {
        ui : viewHelper
      }
    },
    loader: swig.loaders.fs(path.join(path.dirname(__dirname), 'app'))
  });

  app.engine('html', swig.renderFile);
  app.set('swig', swig);
  app.set('view engine', 'html');
  app.set('views', path.join(__dirname, 'views'));
  app.set('view cache', false);

  app.set('helper', viewHelper);

  app.use('/app/static', express.static(path.join(util.getAppRoot(), 'app', 'public')));
  app.use(require('./routes'));

  app.set('commandExecutor', require('./lib/commands')(opts.openWindowFn));
  app.set('openWindowFn', opts.openWindowFn);
  app.set('requestStore', requestStore); // todo: move to proper cache
  app.set('projects', []); // managed in project middleware (todo: move to proper cache)
  app.set('mode', opts.mode);

  server = app.listen(opts.port);
  process.env.MAVENSMATE_SERVER_PORT = opts.port;
  process.env.MAVENSMATE_CONTEXT = 'server';
  app.set('io', require('socket.io')(server));
  return {
    app: app,
    server: server
  };
};

/**
 * Stops express server, clears process vars
 * @return {Nothing}
 */
module.exports.stop = function() {
  server.close();
  delete process.env.MAVENSMATE_SERVER_PORT;
  delete process.env.MAVENSMATE_CONTEXT;
};