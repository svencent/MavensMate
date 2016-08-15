/**
 * @file HTTP Server that renders UIs and can run commands synchronously and asynchronously
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var path            = require('path');
var Promise         = require('bluebird');
var ViewHelper      = require('./helper');
var requestStore    = require('./lib/request-store');
var inherits        = require('inherits');
var util            = require('./lib/util').instance;
var fs              = require('fs-extra');
var _               = require('lodash');
var swig            = require('swig');
var twig            = require('twig')
var express         = require('express');
var logger          = require('winston');
var bodyParser      = require('body-parser');

var app, server;

module.exports.start = function(client) {
  app = express();

  app.use(bodyParser.urlencoded());
  app.use(bodyParser.json({ limit: '100mb' }));

  app.use(require('./middleware/cors'));
  app.use(require('./middleware/logging'));
  app.use(require('./middleware/editor'));
  app.use(require('./middleware/project'));
  app.use(require('./middleware/swig'));

  var viewHelper = new ViewHelper({
    client: client,
    port: client.serverPort
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

  app.set('helper', viewHelper); // TODO: do we need this?

  app.use('/app/static', express.static(path.join(util.getAppRoot(), 'app', 'public')));
  app.use(require('./routes'));

  app.set('requestStore', requestStore);

  server = app.listen(client.serverPort);
  process.env.MAVENSMATE_SERVER_PORT = client.serverPort;
  app.set('io', require('socket.io')(server));
  app.set('client', client);
};

module.exports.stop = function(client) {
  server.close();
  delete process.env.MAVENSMATE_SERVER_PORT;
};