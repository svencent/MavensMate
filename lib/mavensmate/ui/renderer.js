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
	this.command = opts.command;
	this.template = _templateMap[this.command];
	this.context = merge.recursive(globals, this.locals);
	swig.setDefaults({
		locals: {
			mavensmate : {
				ui : Renderer
			}
		},
		loader: swig.loaders.fs(path.join(__dirname,'templates')) 
	});
};

// renders template based on command and locals passed to it
// resolves promise by returning either an error or the location of the template
Renderer.prototype.render = function() {
	var deferred = Q.defer();
	var self = this;
	tmp.file({ prefix: 'mm-', postfix: '.html', keep: true }, function _tempFileCreated(err, filePath) {
	  if (err) {
	  	deferred.reject(err);
	  } else {
	  	try {
	  		logger.debug('rendering template: '+self.template);
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
	return deferred.promise;
};

Renderer.util = util;
Renderer.config = config;

Renderer.getStaticResourcePath = function() {
	return path.join(util.getAppRoot(), 'lib', 'ui', 'resources');
};

Renderer.getBaseUrl = function() {
	return 'http://127.0.0.1:'+config.get('mm_server_port');
};

Renderer.getDefaultSubscription = function() {
	return config.get('mm_default_subscription');
};

Renderer.getWorkspaces = function() {
	var workspaces = config.get('mm_workspace');
	if (!_.isArray(workspaces)) {
		workspaces = [workspaces];
	}
	return workspaces;
};

Renderer.getProject = function() {
	return this.project;
};

Renderer.getSalesforceClient = function() {
	return (this.project) ? this.project.sfdcClient : undefined;
};

Renderer.getProjectPath = function() {
	return this.project !== undefined ? this.project.path : '';
};


module.exports = Renderer;