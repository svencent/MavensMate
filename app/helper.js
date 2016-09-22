/**
 * @file Collection of helper functions for the swig renderer
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var path    = require('path');
var fs      = require('fs-extra');
var util    = require('./lib/util');
var _       = require('lodash');
var config  = require('./config');
var logger  = require('winston');
var querystring = require('querystring');

var ViewHelper = function(opts) {
  util.applyProperties(this, opts);
};

ViewHelper.prototype.util = util;
ViewHelper.prototype.config = config;

ViewHelper.prototype.getSupportedEditors = function() {
  return this.supportedEditors;
};

ViewHelper.prototype.isMenuItemActive = function(url, resource) {
  if (_.isString(resource)) {
    return url.indexOf('/app/'+resource) === 0;
  } else if (_.isArray(resource)) {
    for (var r in resource) {
      if (url.indexOf('/app/'+resource[r]) === 0)
        return true;
    }
    return false;
  } else {
    return false;
  }
};

ViewHelper.prototype.getPhotoUrl = function(project) {
  try {
    return project.sfdcClient.conn.userInfo.photos.thumbnail + '?oauth_token=' + project.sfdcClient.accessToken;
  } catch(e) {
    return null;
  }
};

ViewHelper.prototype.getPathBaseName = function(p) {
  return path.basename(p);
};

ViewHelper.prototype.getRobotPath = function() {
  return this.getBaseUrl() + '/app/static/images/robots/'+(Math.floor(Math.random() * 5) + 1).toString()+'.png';
};

ViewHelper.prototype.getRobotNoise = function() {
  var noises = [
    'blerg', 'bloop', 'beep boop boop', 'beep boop beep', 'morp', 'jonk', 'ping', 'zonk', 'xonx', 'morple', 'fwat', 'turple'
  ];
  var index = Math.floor(Math.random() * noises.length) + 0;
  return noises[index];
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
          var settings = util.getFileBodySync(settingsPath, true);
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
};

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
  return _.sortBy(project.sfdcClient.metadataObjects, 'xmlName');
};

ViewHelper.prototype.doesClassOrTriggerExist = function(project, classOrTriggerName, type) {
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
    return fs.readFileSync(path.join(project.path, 'src', 'classes', classOrTriggerName+'.cls'), 'utf8').toString().split(/\r?\n/);
  } else if (type === 'ApexTrigger') {
    return fs.readFileSync(path.join(project.path, 'src', 'triggers', classOrTriggerName+'.trigger'), 'utf8').toString().split(/\r?\n/);
  }
};

ViewHelper.prototype.getCoverageCssClass = function(percentCovered) {
  if (percentCovered <= 40) {
    return 'error';
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