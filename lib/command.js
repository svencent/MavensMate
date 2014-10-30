'use strict';

var _ 		= require('lodash');
var path 	= require('path');
// var util = require('./util').instance;

var BaseCommand = function(opts) {
	// console.log('opts -->');
	// console.log(opts);
	// require.main === module doesn't work for us because tests are run via cli
	// instead, we look for the presence of a commander program
	if (_.has(opts, '_name') && _.has(opts, '_args') && _.has(opts, '_execs')) {
		console.log('this is running via comamnd line!');
		this._cli = true;
		this._program = opts;
	} else {
		console.log('this is running via node app!');
		this._initGlobalProgram(opts); // mimic commander.js
		this._cli = false;
	}
};

BaseCommand.prototype._initGlobalProgram = function(opts) {
	global.appRoot = path.resolve(path.join(__dirname, '..'));
	this._program = {};
	this._parseArgs(opts.args);
	var program = require('commander');
	global.program = program;
	require('./logger')(program);
	require('./loader')(program);
};

BaseCommand.prototype._parseArgs = function(opts) {
	var self = this;
	_.forOwn(opts, function(val, key) {
		self._program[key] = val;
	});
};

BaseCommand.prototype.execute = function(callback) {
	this._callback = callback;
};

BaseCommand.prototype.respond = function(res, success, error) {
	// if we're headless, we need to properly format the response with JSON
	// otherwise we can just log the result
	console.log('responding!');
	if (!this.isCli()) {
	  // this is a standard response to a consuming client
	  // response should be deserialized into a valid JSON string
	  var response = {};
	  success = success === undefined ? true : success;
	  response.result = res;
	  if (!success && error !== undefined) {
	    response.body = error.message;
	    response.stack = error.stack;
	  }
	  if (_.isFunction(this._callback)) {
	  	if (success) {
	  		this._callback(null, response);
	  	} else {
	  		this._callback(error);
	  	}
	  } else {
	  	return response;
	  }
	} else if (this.isHeadless() && !this.isDebugging()) {
	  // this is a standard response to a consuming client
	  // response should be deserialized into a valid JSON string
	  var response = {};
	  if (success === undefined) {
	    success = true;
	  }
	  if (_.isArray(res)) {
	    response.body = res;
	    response.success = success;
	  } else if (typeof res === 'object') {
	    response.body = res;
	    if (!_.has(res, 'success')) {
	      response.success = success;
	    }
	  } else if (_.isString(res)) {
	    response.body = res;
	    response.success = success;
	  }
	  if (!success && error !== undefined) {
	    response.body = error.message;
	    response.stack = error.stack;
	    console.error(JSON.stringify(response));
	    process.exit(1);
	  } else {
	    console.log(JSON.stringify(response));
	  }
	} else {
	  console.log(res);
	  global.logger.debug(res);
	  if (!success && error !== undefined && error.stack !== undefined) {
	    var endOfLine = require('os').EOL;
	    console.error(endOfLine+'Promise Trace -->');
	    var stackLines = error.stack.split(endOfLine);
	    var errors = stackLines[0];
	    _.each(errors.split('Error: '), function(e) {
	      console.error(e);
	    });
	    stackLines.shift();
	    console.error(endOfLine+'Stack Trace -->');
	    console.error(stackLines.join(endOfLine));
	  }
	}
};

BaseCommand.prototype.isCli = function() {
	return this._cli;
};

/**
 * Headless flag is typically used by plugin clients to ensure STDOUT is deserialized JSON string
 * @return {Boolean} Whether the program is running in headless mode
 */
BaseCommand.prototype.isHeadless = function() {
  return global.program.headless === true;
};

/**
 * Returns the plugin client being used
 * @return {String} sublime|atom|etc.
 */
BaseCommand.prototype.getClient = function() {
  return global.program.client;
};

/**
 * Whether the command is considered "interactive" mode
 * @return {Boolean}
 */
BaseCommand.prototype.isInteractive = function() {
  return !this.isHeadless();
};

/**
 * Whether the command is requesting a UI
 * @return {Boolean}
 */
BaseCommand.prototype.isUICommand = function() {
  return this._program.ui === true;
};

/**
 * Whether the program has specified the --debugging flag, which will provide verbose STDOUT
 * @return {Boolean} 
 */
BaseCommand.prototype.isDebugging = function() {
  return global.program.debugging;
};

module.exports = BaseCommand;
