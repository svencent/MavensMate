/**
 * @file Sets up winston logging. bin/mavensmate / bin/server require and configure, other modules simply require('winston') to share global winston object.
 * @author Joseph Ferraro <@joeferraro>
 */

 'use strict';

/**
 * initiates logging via winston
 * @param  {Object} opts
 * @param  {Object} opts.program - Commander.js program (optional)
 * @return {Object} - winston logger
 */
module.exports = function(opts) {
  opts = opts || {};

  var fs = require('fs');
  var path = require('path');
  var winston = require('winston');
  var config = require('../config');

  try {
    winston.remove(winston.transports.Console);
  } catch(e) { }

  var logLevel;
  if (config.get('mm_log_level')) {
    logLevel = config.get('mm_log_level').toLowerCase();
  } else {
    logLevel = 'info';
  }

  // if we're not a cli client or if our cli client is verbose, log to the console
  if (!opts.program || (opts.program && opts.program.verbose)) {
    winston.cli();
    winston.add(winston.transports.Console, {
      level: logLevel,
      exitOnError: false,
      prettyPrint: true,
      colorize: true
    });
  }

  // place logs in mm_log_location if it exists
  if (fs.existsSync(config.get('mm_log_location'))) {
    try {
      winston.add(winston.transports.File, {
        filename: path.join(config.get('mm_log_location'), 'mavensmate.log'),
        level: logLevel,
        json: false,
        maxsize: 104857600,
        maxFiles: 2
      });
    } catch(e) {
      if (e.message.indexOf('Transport already attached') === -1) {
        throw e;
      }
    }
  }

  winston.info('MavensMate log level: '+logLevel);

  return winston;
};