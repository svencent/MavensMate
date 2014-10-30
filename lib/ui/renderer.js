'use strict';
var swig  	= require('swig');
var tmp 		= require('tmp');
var Q 			= require('q');
var path 		= require('path');
var merge 	= require('merge');
var fs 			= require('fs-extra');
var util 		= require('../util').instance;
var _ 			= require('lodash');

var _templateMap = {
	'new-project' : path.join('project','new.html'),
	'edit-project' : path.join('project','edit.html')
};

var globals = {
  project_name: 'awesome people',
  project_settings: {}
};

var Renderer = function(command, locals) {
	this.command = command;
	this.template = _templateMap[command];
	this.context = merge.recursive(globals, locals);
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
	  		var rendered = swig.renderFile(self.template, self.context);
	  		fs.outputFile(filePath, rendered, function(err) {
	  		  if (err) {
	  		    deferred.reject(err);  
	  		  } else {
	  		    deferred.resolve(filePath);
	  		  }
	  		});	
	  	} catch(e) {
	  		deferred.reject(new Error('Could not render template: '+e.message));
	  	}
	  }
	});
	return deferred.promise;
};

Renderer.util = util;
Renderer.config = global.config;

Renderer.getStaticResourcePath = function() {
	return path.join(global.appRoot, 'lib', 'ui', 'resources');
};

Renderer.getBaseUrl = function() {
	return 'http://127.0.0.1:'+global.config.get('mm_server_port');
};

Renderer.getDefaultSubscription = function() {
	return global.config.get('mm_default_subscription');
};

Renderer.getWorkspaces = function() {
	var workspaces = global.config.get('mm_workspace');
	if (!_.isArray(workspaces)) {
		workspaces = [workspaces];
	}
	return workspaces;
};

Renderer.getProject = function() {
	return global.project;
};

Renderer.getSalesforceClient = function() {
	return global.sfdcClient;
};

Renderer.getProjectPath = function() {
	return global.project !== undefined ? global.project.path : '';
};


module.exports = Renderer;