'use strict';
var swig  	= require('swig');
var tmp 		= require('tmp');
var Q 			= require('q');
var path 		= require('path');
var merge 	= require('merge');
var fs 			= require('fs-extra');
var util 		= require('../util').instance;
var _ 			= require('lodash');
var config 	= require('../config');
var logger  = require('winston');

var _templateMap = {
	'new-project' : path.join('project','new.html'),
	'edit-project' : path.join('project','edit.html')
};

var globals = {
  project_name: 'awesome people',
  project_settings: {}
};

var Renderer = function(opts) {
  util.applyProperties(this, opts);
	var self = this;
	this.context = merge.recursive(globals, this.locals);
	logger.debug('initing swig fs loader at: '+path.join(__dirname,'templates'));
	swig.setDefaults({
		locals: {
			mavensmate : {
				ui : self
			}
		},
		loader: swig.loaders.fs(path.join(__dirname,'templates')) 
	});
};

// renders template based on command and locals passed to it
// resolves promise by returning either an error or the location of the template
Renderer.prototype.render = function(command, renderToTmpFile) {
	var deferred = Q.defer();
	var self = this;
	self.command = command;
	self.template = _templateMap[command];
	logger.debug('rendering template: '+self.template);
	if (renderToTmpFile) {
		tmp.file({ prefix: 'mm-', postfix: '.html', keep: true }, function _tempFileCreated(err, filePath) {
		  if (err) {
		  	deferred.reject(err);
		  } else {
		  	try {
		  		var rendered = swig.renderFile(self.template, self.context);
	  			fs.outputFile(filePath, rendered, function(err) {
	  			  if (err) {
	  			    deferred.reject(err);  
	  			  } else {
	  			    deferred.resolve(filePath);
	  			  }
	  			});	
		  	} catch(e) {
		  		logger.error('Could not render template: '+e.message+ ' '+e.stack);
		  		deferred.reject(new Error('Could not render template: '+e.message));
		  	}
		  }
		});
	} else {
		swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) }); // for some reason swig loses this context between express.js requests, need to set every time
		var rendered = swig.renderFile(self.template, self.context);
	  deferred.resolve(rendered);
	}
	return deferred.promise;
};

Renderer.prototype.util = util;
Renderer.prototype.config = config;

Renderer.prototype.getClient = function() {
	return this.client;
};

Renderer.prototype.getStaticResourcePath = function() {
	return 'static';
};

Renderer.prototype.getBaseUrl = function() {
	return 'http://127.0.0.1:'+this.port;
};

Renderer.prototype.getDefaultSubscription = function() {
	return config.get('mm_default_subscription');
};

Renderer.prototype.getWorkspaces = function() {
	var workspaces = config.get('mm_workspace');
	if (!_.isArray(workspaces)) {
		workspaces = [workspaces];
	}
	return workspaces;
};

Renderer.prototype.getProject = function() {
	return this.project;
};

Renderer.prototype.getSalesforceClient = function() {
	return (this.project) ? this.project.sfdcClient : undefined;
};

Renderer.prototype.getProjectPath = function() {
	return this.project !== undefined ? this.project.path : '';
};


module.exports = Renderer;