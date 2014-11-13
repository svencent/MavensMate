'use strict';

var swig 		= require('swig');
// var tmp 		= require('tmp');
// var Q 			= require('q');
var path 		= require('path');
var fs 			= require('fs-extra');
var util 		= require('../util').instance;
var _ 			= require('lodash');
var config 	= require('../config');
var logger  = require('winston');

// var _templateMap = {
// 	'new-project' : path.join('project','new.html'),
// 	'edit-project' : path.join('project','edit.html'),
// 	'new-metadata' : path.join('metadata','new.html'),
// 	'deploy' : path.join('deploy','index.html'),
// 	'test' : path.join('unit_test', 'index.html'),
// 	'test-results' : path.join('unit_test', 'result.html'),
// 	'test-coverage' : path.join('unit_test', 'coverage.html'),
// 	'stack-trace' : path.join('debug_log', 'index.html')
// };

var ViewHelper = function(opts) {
  util.applyProperties(this, opts);
	// var self = this;
	// logger.debug('initing swig fs loader at: '+path.join(__dirname,'templates'));
	// swig.setDefaults({
	// 	runInVm: true,
	// 	locals: {
	// 		mavensmate : {
	// 			ui : self
	// 		}
	// 	},
	// 	loader: swig.loaders.fs(path.join(__dirname,'templates')) 
	// });
};

ViewHelper.prototype.util = util;
ViewHelper.prototype.config = config;

ViewHelper.prototype.getClient = function() {
	return this.client;
};

ViewHelper.prototype.getStaticResourcePath = function() {
	return this.getBaseUrl() + '/app/static';
};

ViewHelper.prototype.getBaseUrl = function() {
	return 'http://127.0.0.1:'+this.port;
};

ViewHelper.prototype.getDefaultSubscription = function() {
	return config.get('mm_default_subscription');
};

ViewHelper.prototype.getWorkspaces = function() {
	var workspaces = config.get('mm_workspace');
	if (!_.isArray(workspaces)) {
		workspaces = [workspaces];
	}
	return workspaces;
};

ViewHelper.prototype.getMetadataObjects = function() {
	return _.sortBy(this.getProject().describe.metadataObjects, 'xmlName');
};

ViewHelper.prototype.getProjectSubscription = function() {
	return this.getProject().getSubscription() || [];
};

ViewHelper.prototype.getProject = function() {
	return this.project || this.client.getProject();
};

ViewHelper.prototype.getSalesforceClient = function() {
	return (this.getProject()) ? this.getProject().sfdcClient : undefined;
};

ViewHelper.prototype.getProjectPath = function() {
	return this.getProject() !== undefined ? this.getProject().path : '';
};

ViewHelper.prototype.getCoverageCssClass = function(percentCovered) {
	if (percentCovered <= 40) {
		return 'danger';
	} else if (percentCovered < 75) {
		return 'warning';
	} else {
		return 'success';
	}
};

ViewHelper.prototype.doesClassOrTriggerExist = function(classOrTriggerName, type) {
	var self = this;
	if (type === 'ApexClass') {
		return fs.existsSync(path.join(self.getProject().path), 'src', 'classes', classOrTriggerName+'.cls');
	} else if (type === 'ApexTrigger') {
		return fs.existsSync(path.join(self.getProject().path), 'src', 'triggers', classOrTriggerName+'.trigger');
	}
};

ViewHelper.prototype.getFileLines = function(classOrTriggerName, type) {
	var self = this;
	if (type === 'ApexClass') {
		return fs.readFileSync(path.join(self.getProject().path, 'src', 'classes', classOrTriggerName+'.cls'), 'utf8').toString().split(require('os').EOL);
	} else if (type === 'ApexTrigger') {
		return fs.readFileSync(path.join(self.getProject().path, 'src', 'triggers', classOrTriggerName+'.trigger'), 'utf8').toString().split(require('os').EOL);
	}
};

ViewHelper.prototype.htmlize = function(str) {
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


module.exports = ViewHelper;