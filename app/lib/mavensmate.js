/*
 * @file global MavensMate process
 * @author Joe Ferraro <@joeferraro>
 */

var mavensmate = exports;

var Promise = require('bluebird');
mavensmate.startServer = function(opts) {
  return new Promise(function(resolve, reject) {
    opts = opts || {};
    try {
      var server = require('../index');
      var port = opts.port || '56248';
      var verbose = opts.verbose || false;

      var res = server.start({
        port: port,
        verbose: opts.verbose,
        openWindowFn: opts.openWindowFn
      });
      console.log('MavensMate server running on port: '+port);
      res.config = require('../config');
      res.logger = require('winston');
      resolve(res);
    } catch(e) {
      console.error('MavensMate server failed to start: '+e.message);
      reject(e);
    }
  });
};