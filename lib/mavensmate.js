'use strict';

/* global process */
/**
 * @file MavensMate API
 * @author Joe Ferraro <ferraro.joseph@gmail.com>
 */
// exports.Connection = require('./connection');
// exports.OAuth2 = require('./oauth2');
// exports.Date = exports.SfDate = require("./date");
// exports.RecordStream = require('./record-stream');


var program = require('commander');
var path 		= require('path');
var up      = require('underscore-plus');
var fs      = require('fs');

var MavensMate = function(){};

MavensMate.execute = function() {

};

var mavensmate = new MavensMate();

function init() {
  // initialize top-level program with global options
  program
    .version('0.0.1')
    .option('-d --debugging', 'Explicitly enables logging. When in headless mode, debug statements will be placed in "debug" object in JSON response.')
    .option('-h --headless', 'Runs in headless mode, requiring piped-JSON for context. Best for use by MavensMate text editor/IDE clients.')
    .option('-c --client [name]', 'Specifies the plugin client (SUBLIME_TEXT, ATOM)') // no default set
    .parse(process.argv, true); // parse top-level args, defer subcommand

  global.appRoot = path.resolve(path.join(__dirname, '..'));
  global.program = program;

  // init global config first, then proceed
  require('../lib/config')(program);    
  require('../lib/logger')(program);
  require('../lib/loader')(program);
  require('autocmdr/lib/completion')(program);
  require('autocmdr/lib/package')(program);
  require('autocmdr/lib/help')(program);

  global.logger.debug('\n\n\n\n=====> RUNNING COMMAND:\n');
  global.logger.debug('Args: '+JSON.stringify(process.argv));
}

function cli() { 
  // initialize top-level program with global options
  program
    .version('0.0.1')
    .option('-d --debugging', 'Explicitly enables logging. When in headless mode, debug statements will be placed in "debug" object in JSON response.')
    .option('-h --headless', 'Runs in headless mode, requiring piped-JSON for context. Best for use by MavensMate text editor/IDE clients.')
    .option('-c --client [name]', 'Specifies the plugin client (SUBLIME_TEXT, ATOM)') // no default set
    .parse(process.argv, true); // parse top-level args, defer subcommand

  // custom help
  program.on('--help', function(){
    console.log('  Examples:');
    console.log('');
    console.log('    $ custom-help --help');
    console.log('    $ custom-help -h');
    console.log('');
  });

  if (program.args.length < 1 ) {
    console.log('No command specified. See \'mm-node --help\':');
    program.outputHelp();
    process.exit(1);
  }

  global.appRoot = path.resolve(path.join(__dirname, '..'));
  global.program = program;

  var config =  require('../lib/config');    

  console.log(config);

  var logger =  require('../lib/logger')(program);
                require('../lib/loader')(program);
                require('autocmdr/lib/completion')(program);
                require('autocmdr/lib/package')(program);
                require('autocmdr/lib/help')(program);

  console.log('----->');
  console.log(config.get('mm_api_version'));

  logger.debug('\n\n\n\n=====> RUNNING COMMAND:\n');
  logger.debug('Args: '+JSON.stringify(process.argv));
  program.parse(process.argv); // run subcommand if necessary
}

var exports = {
  cli : cli,
  mavensmate: mavensmate
};

var cmdPath = path.join(path.dirname(__dirname), 'cmds');
fs.readdirSync(cmdPath).forEach(function(filename) {
  var filepath = path.join(cmdPath,filename);
  exports[up.capitalize(up.camelize(path.basename(filepath).split('.')[0])+'Command')] = require(filepath).command;
});

module.exports = exports;
