/* commander/autocmdr component
 * Adds a winston logger as program.log.  Adds .option('-d, --debug', "enable debugger") to the program.
 * To use add require('autocmdr/lib/logger.js')(program) where program is a commander or autocmdr program.
 */

module.exports = function (program) {
  'use strict';

  var fs = require('fs');
  var path = require('path');
  var winston = require('winston');
  var config = require('./config');

  var util = require('util');
  util.inspect(config);

  var hasDebuggingOption;
  if (program !== undefined) {
    // check if global --log is on
    var argv = program.normalize(process.argv);
    hasDebuggingOption = argv.indexOf('-d') > -1 || argv.indexOf('--debugging') > -1; // Need this early
  }

  var logger = new (winston.Logger)({
    exitOnError: false
  });

  // if -l flag, add console logging
  if (hasDebuggingOption) {
    logger.cli();
    logger.add(winston.transports.Console, {
      level: 'debug'
    });
  }

  // file-based logging, set up in client
  var logFileLevel;
  if (config.get('mm_log_level') !== undefined && config.get('mm_log_level') !== '') {
    logFileLevel = config.get('mm_log_level').toLowerCase();
  } else {
    logFileLevel = 'info'; 
  }

  // place logs in mm_log_location if it exists
  if (fs.existsSync(config.get('mm_log_location'))) {
    logger.add(winston.transports.File, { 
      filename: path.join(config.get('mm_log_location'), 'mavensmate.log'),
      level: logFileLevel,
      json: false
    });
  }

  if (program !== undefined) {
    program.log = function(){}; //suppress logging from autocmdr module
    program.log.debug = function(){}; //suppress logging from autocmdr module    
  }

  if (hasDebuggingOption) {
    logger.debug('Debug logging is on');
  }

  return logger;
};
