/* commander/autocmdr component
 * Adds a winston logger as program.log.  Adds .option('-d, --debug', "enable debugger") to the program.
 * To use add require('autocmdr/lib/logger.js')(program) where program is a commander or autocmdr program.
 */

module.exports = function (program) {
  'use strict';

  var fs = require('fs');
  var path = require('path');
  var winston = require('winston');

  // console.log(global.config.get('mm_log_level'));
  // console.log(global.config.get('mm_log_location'));

  // check if global --log is on
  var argv = program.normalize(process.argv);
  var hasLogOption = argv.indexOf('-l') > -1 || argv.indexOf('--log') > -1; // Need this early

  var logger = new (winston.Logger)({
    exitOnError: false
  });

  // if -l flag, add console logging
  if (hasLogOption) {
    logger.cli();
    logger.add(winston.transports.Console, {
      level: 'debug'
    });
  }

  // file-based logging, set up in client
  var logFileLevel;
  if (global.config.get('mm_log_level') !== undefined && global.config.get('mm_log_level') !== '') {
    logFileLevel = global.config.get('mm_log_level').toLowerCase();
  } else {
    logFileLevel = 'info'; 
  }

  // place logs in mm_log_location if it exists
  if (fs.existsSync(global.config.get('mm_log_location'))) {
    logger.add(winston.transports.File, { 
      filename: path.join(global.config.get('mm_log_location'), 'mavensmate.log'),
      level: logFileLevel,
      json: false
    });
  }

  program.log = logger;
  global.logger = logger;

  if (hasLogOption) {
    global.logger.debug('Debug logging is on');
  }
};