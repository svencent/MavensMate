'use strict';

var _ = require('lodash');

var BaseCommand = function(args) {
	this.client = args[0];
	this.payload = args[1];
	this._callback = args[2];
};

BaseCommand.prototype.setId = function(id) {
	this._id = id;
};

BaseCommand.prototype.getId = function() {
	return this._id;
};

BaseCommand.prototype.setProject = function(project) {
	this._project = project;
};

BaseCommand.prototype.getProject = function() {
	return this._project;
};

BaseCommand.prototype.respond = function(res, success, error) {
	// if we're headless, we need to properly format the response with JSON
	// otherwise we can just log the result
	var self = this;
	var response;
	if (!self.client.isCommandLine()) {
	  // this is a standard response to a consuming client
	  // response should be deserialized into a valid JSON string
	  response = {};
	  success = success === undefined ? true : success;
	  response.result = res;
	  if (!success && error !== undefined) {
	    response.result = error.message;
	    response.stack = error.stack;
	  }
	  if (_.isFunction(self._callback)) {
	  	if (success) {
	  		self._callback(null, response);
	  	} else {
	  		self._callback(error);
	  	}
	  } else {
	  	return response;
	  }
	} else if (self.client.isHeadless() && !self.client.isDebugging()) {
	  // this is a standard response to a consuming client
	  // response should be deserialized into a valid JSON string
	  response = {};
	  if (success === undefined) {
	    success = true;
	  }
	  if (_.isArray(res)) {
	    response.result = res;
	    response.success = success;
	  } else if (typeof res === 'object') {
	    response.result = res;
	    if (!_.has(res, 'success')) {
	      response.success = success;
	    }
	  } else if (_.isString(res)) {
	    response.result = res;
	    response.success = success;
	  }
	  if (!success && error !== undefined) {
	  	response.success = false;
	    response.result = error.message;
	    response.stack = error.stack;
	    console.error(JSON.stringify(response));
	    process.exit(1);
	  } else {
	    console.log(JSON.stringify(response));
	    process.exit(0);
	  }
	} else {
	  self.client.logger.debug(res);
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
	    process.exit(1);
	  }
	  process.exit(0);
	}
};

/**
 * Whether the command is requesting a UI
 * @return {Boolean}
 */
BaseCommand.prototype.isUICommand = function() {
  return (this.payload && this.payload.args) ? this.payload.args.ui : false;
};

module.exports = BaseCommand;
