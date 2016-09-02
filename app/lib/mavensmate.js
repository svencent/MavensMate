/*
 * @file global MavensMate process
 * @author Joe Ferraro <@joeferraro>
 */

var mavensmate = exports;

var Promise = require('bluebird');
var server  = require('../index');

mavensmate.CommandExecutor = require('./commands');
mavensmate.Project = require('./project');
mavensmate.SalesforceClient = require('./sfdc-client');

mavensmate.startServer = function(opts) {
  return new Promise(function(resolve, reject) {
    opts = opts || {};
    try {
      var port = opts.port || '56248';
      var verbose = opts.verbose || false;
      server.start({
        port: port,
        verbose: opts.verbose,
        openWindowFn: opts.openWindowFn,
        mode: opts.mode
      })
      .then(function(res) {
        console.log('MavensMate server running on port: '+port);
        res.config = require('../config');
        res.logger = require('winston');
        resolve(res);
      })
      .catch(function(e) {
        console.error('Could not run MavensMate server', e);
        reject(e);
      });
    } catch(e) {
      console.error('MavensMate server failed to start: '+e.message);
      reject(e);
    }
  });
};

mavensmate.stopServer = function(opts) {
  server.stop();
};