'use strict';
var swig  = require('swig');
var tmp = require('tmp');
var Q = require('q');
var path = require('path');
var merge = require('merge');

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
	swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
};

// renders template based on command and locals passed to it
// resolves promise by returning either an error or the location of the template
Renderer.prototype.render = function() {
	var deferred = Q.defer();
	var thiz = this;
	tmp.file({ prefix: 'mm-', postfix: '.html', keep: true }, function _tempFileCreated(err, p, fd) {
	  if (err) {
	  	deferred.reject(new Error(err));
	  }
	  
		var rendered = swig.renderFile(thiz.template, thiz.context);
	  deferred.resolve(p);
	});

	return deferred.promise;
};

module.exports = Renderer;