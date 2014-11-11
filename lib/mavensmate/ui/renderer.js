'use strict';

var swig 		= require('swig');
var tmp 		= require('tmp');
var Q 			= require('q');
var path 		= require('path');
var fs 			= require('fs-extra');
var util 		= require('../util').instance;
var _ 			= require('lodash');
var config 	= require('../config');
var logger  = require('winston');

var _templateMap = {
	'new-project' : path.join('project','new.html'),
	'edit-project' : path.join('project','edit.html'),
	'new-metadata' : path.join('metadata','new.html'),
	'deploy' : path.join('deploy','index.html'),
	'test' : path.join('unit_test', 'index.html'),
	'test-results' : path.join('unit_test', 'result.html'),
	'test-coverage' : path.join('unit_test', 'coverage.html'),
	'stack-trace' : path.join('debug_log', 'index.html')
};

var Renderer = function(opts) {
  util.applyProperties(this, opts);
	var self = this;
	logger.debug('initing swig fs loader at: '+path.join(__dirname,'templates'));
	swig.setDefaults({
		runInVm: true,
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
	logger.debug('rendering template for: '+self.command+', '+self.template);
	if (renderToTmpFile) {
		tmp.file({ prefix: 'mm-', postfix: '.html', keep: true }, function _tempFileCreated(err, filePath) {
		  if (err) {
		  	deferred.reject(err);
		  } else {
		  	try {
		  		var rendered = swig.renderFile(self.template, self.locals);
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
		swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.join(__dirname,'templates')) }); // for some reason swig loses this context between express.js requests, need to set every time
		var rendered = swig.renderFile(self.template, self.locals);
	  deferred.resolve(rendered);
	}
	return deferred.promise;
};

Renderer.prototype.util = util;
Renderer.prototype.config = config;

Renderer.prototype.getClient = function() {
	return this.client;
};

Renderer.prototype.getTestClasses = function() {
	var classes = [];
	var classPath = path.join(this.getProject().path, 'src', 'classes');
	console.log(classPath);
	if (fs.existsSync(classPath)) {
		fs.readdirSync(classPath).forEach(function(filename) {
			var fileNameParts = path.basename(filename).split('.');
			var bn = fileNameParts[0];
			if (fileNameParts.length === 2) {
				if (util.startsWith(bn, 'test') || util.endsWith(bn, 'test')) {
					classes.push(bn);
				}
			}
		});
	}
	return classes;
};

Renderer.prototype.getCoverageCssClass = function(percentCovered) {
	if (percentCovered <= 40) {
		return 'danger';
	} else if (percentCovered < 75) {
		return 'warning';
	} else {
		return 'success';
	}
};

Renderer.prototype.doesClassOrTriggerExist = function(classOrTriggerName, type) {
	// console.log('doesClassOrTriggerExist');
	// console.log(projectPath);
	// console.log(classOrTriggerName);
	// console.log(type);
	var self = this;
	if (type === 'ApexClass') {
		return fs.existsSync(path.join(self.getProject().path), 'src', 'classes', classOrTriggerName+'.cls');
	} else if (type === 'ApexTrigger') {
		return fs.existsSync(path.join(self.getProject().path), 'src', 'triggers', classOrTriggerName+'.trigger');
	}
};

Renderer.prototype.getFileLines = function(classOrTriggerName, type) {
	var self = this;
	if (type === 'ApexClass') {
		return fs.readFileSync(path.join(self.getProject().path, 'src', 'classes', classOrTriggerName+'.cls'), 'utf8').toString().split(require('os').EOL);
	} else if (type === 'ApexTrigger') {
		return fs.readFileSync(path.join(self.getProject().path, 'src', 'triggers', classOrTriggerName+'.trigger'), 'utf8').toString().split(require('os').EOL);
	}
};

Renderer.prototype.htmlize = function(str) {
	try {
		str = str.replace(/&/g, '&amp;');
		str = str.replace(/"/g, '&quot;');
		str = str.replace(/</, '&lt;');
		str = str.replace(/>/, '&gt;');
		str = str.replace(/\t/, '&nbsp;&nbsp;&nbsp;&nbsp;');
		str = str.replace(/\s/, '&nbsp;');
		str = str.replace(/\n/, '<br/>');
		return str;
	} catch(e) {
		return str;
	}
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

Renderer.prototype.getMetadataObjects = function() {
	return _.sortBy(this.getProject().describe.metadataObjects, 'xmlName');
};

Renderer.prototype.getProjectSubscription = function() {
	return this.getProject().getSubscription();
};

Renderer.prototype.getProject = function() {
	return this.project || this.client.getProject();
};

Renderer.prototype.getSalesforceClient = function() {
	return (this.getProject()) ? this.getProject().sfdcClient : undefined;
};

Renderer.prototype.getProjectPath = function() {
	return this.getProject() !== undefined ? this.getProject().path : '';
};


module.exports = Renderer;