/**
 * @file Collection of helper functions for the swig renderer
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var path    = require('path');
var fs      = require('fs-extra');
var util    = require('../util').instance;
var _       = require('lodash');
var config  = require('../config');
var logger  = require('winston');

var ViewHelper = function(opts) {
  util.applyProperties(this, opts);
};

ViewHelper.prototype.util = util;
ViewHelper.prototype.config = config;

ViewHelper.prototype.getClient = function() {
  return this.client;
};

ViewHelper.prototype.getEditor = function() {
  return this.client.name;
};

ViewHelper.prototype.getPathBaseName = function(p) {
  return path.basename(p);
};

ViewHelper.prototype.listProjects = function() {
  var workspaces = config.get('mm_workspace');
  var projects = [];
  if (_.isString(workspaces) && workspaces === '') {
    workspaces = [];
  }
  if (!_.isArray(workspaces)) {
    workspaces = [workspaces];
  }
  _.each(workspaces, function(workspacePath) {
    try {
      var projectPaths = util.listDirectories(workspacePath);
      _.each(projectPaths, function(projectPath) {
        var settingsPath = path.join(projectPath, 'config', '.settings');
        if (fs.existsSync(settingsPath)) {
          var settings = util.getFileBody(settingsPath, true);
          projects.push({
            id: settings.id,
            path: projectPath
          });
        }
      });
    } catch(e) {
      logger.error('Could not list projects: '+e.message);
    }
  });
  return projects;
}

ViewHelper.prototype.getStaticResourcePath = function() {
  return this.getBaseUrl() + '/app/static';
};

ViewHelper.prototype.getBaseUrl = function() {
  return 'http://localhost:'+this.port;
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

ViewHelper.prototype.getMetadataObjects = function(project) {
  return _.sortBy(project.getDescribe().metadataObjects, 'xmlName');
};

ViewHelper.prototype.doesClassOrTriggerExist = function(project, classOrTriggerName, type) {
  console.log('doesClassOrTriggerExist');
  console.log(project);
  var self = this;
  if (type === 'ApexClass') {
    return fs.existsSync(path.join(project.path), 'src', 'classes', classOrTriggerName+'.cls');
  } else if (type === 'ApexTrigger') {
    return fs.existsSync(path.join(project.path), 'src', 'triggers', classOrTriggerName+'.trigger');
  }
};

ViewHelper.prototype.getFileLines = function(project, classOrTriggerName, type) {
  var self = this;
  if (type === 'ApexClass') {
    return fs.readFileSync(path.join(project.path, 'src', 'classes', classOrTriggerName+'.cls'), 'utf8').toString().split(require('os').EOL);
  } else if (type === 'ApexTrigger') {
    return fs.readFileSync(path.join(project.path, 'src', 'triggers', classOrTriggerName+'.trigger'), 'utf8').toString().split(require('os').EOL);
  }
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

ViewHelper.prototype.htmlize = function(str) {
  try {
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/"/g, '&quot;');
    str = str.replace(/</g, '&lt;');
    str = str.replace(/>/g, '&gt;');
    str = str.replace(/\n/g, '<br/>');
    str = str.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    str = str.replace(/\s/g, '&nbsp;');
    return str;
  } catch(e) {
    return str;
  }
};

ViewHelper.prototype.getDeployMessageFileNameBaseName = function(str) {
  return str.split('/').pop();
};

ViewHelper.prototype.isFalse = function(input) {
  return input === false || input === 'false' || input === 0;
};

ViewHelper.prototype.isTrue = function(input) {
  return input === true || input === 'true' || input === 1;
};


module.exports = ViewHelper;