/**
 * @file Responsible for launching MavensMate UIs and opening files in the client editor
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var which       = require('which');
var spawn       = require('child_process').spawn;
var logger      = require('winston');
var util        = require('./util').instance;
var config      = require('./config');
var path        = require('path');
var os          = require('os');
var fs          = require('fs-extra');
var open        = require('open');
var querystring = require('querystring');

/**
 * Service to handle interaction with the client's editor (sublime, atom, etc.)
 * @param {Client} client
 */
var EditorService = function(client, editor) {
  if (!_.isObject(client)) {
    throw new Error('Could not initiate editor service. Editor service must include valid client.');
  }
  this.client = client;
  this.editor = editor;
};

/**
 * Maps a given command name to the uri
 * @type {Object}
 */
EditorService.prototype._uriMap = {
  'home': 'home/index',
  'settings': 'settings/index',
  'new-project': 'project/new',
  'new-project-from-existing-directory': 'project/new-from-existing-directory',
  'edit-project': 'project/edit',
  'new-metadata': 'metadata/new',
  'deploy': 'deploy/new',
  'test': 'test/new',
  'run-tests': 'test/new',
  'execute-apex': 'apex/new',
  'new-lightning-app': 'lightning/new-app',
  'new-lightning-component': 'lightning/new-component',
  'new-lightning-event': 'lightning/new-event',
  'new-lightning-interface': 'lightning/new-interface'
};

/**
 * Launches the MavensMate UI in either MavensMateWindowServer.app (osx) or the web browser (Linux/Windows) 
 * @param  {String} commandName
 * @return {Nothing}
 */
EditorService.prototype.launchUI = function(commandName, urlParams) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var portNumber = process.env.MAVENSMATE_SERVER_PORT || self.client.serverPort;

    if (!portNumber) {
      return reject(new Error('Could not detect local MavensMate server port. Set MAVENSMATE_SERVER_PORT environment variable or client.serverPort.'));
    }

    var url = 'http://localhost:'+portNumber+'/app/'+self._uriMap[commandName];
    if (self.editor && urlParams) {
      urlParams.editor = self.editor;
    } else if (self.editor) {
      urlParams = {};
      urlParams.editor = self.editor;
    }
    if (urlParams) {
      url += '?'+querystring.stringify(urlParams);
    }

    logger.debug('opening url --->');
    logger.debug(url);

    var useBrowerAsUi = config.get('mm_use_browser_as_ui', false);
    
    if (self.client.windowOpener) {
      self.client.windowOpener(url);
      resolve();
    } else if (os.platform() === 'darwin' && !useBrowerAsUi) {
      var windowServerPath = path.join(util.getAppRoot(), 'bin', 'MavensMateWindowServer.app');  
      var windowServerChildProcess = spawn('open', ['-n', windowServerPath, '--args', '-url', url], {
        detached: true
      });
      windowServerChildProcess.on('close', function (code) {
        if (code === 0 && self.client.isCommandLine()) {
          resolve();
          process.exit(0);
        } else {
          resolve();
        }
      });
    } else {
      // open web browser
      open(url, function() {
        if (self.client.isCommandLine()) {
          resolve();
          process.exit(0);
        } else {
          resolve();
        }
      });

    }
  });
};

/**
 * Opens the specified URL in the user's browser (should probably be located in util, but oh well)
 * @param  {String} url - url to open in the browser
 */
EditorService.prototype.openUrl = function(url) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (self.client.windowOpener) {
        self.client.windowOpener(url);
        resolve();
      } else if (os.platform() === 'darwin') {    
        var browserChildProcess = spawn('open', [url], {
          detached: true
        });

        browserChildProcess.on('close', function (code) {
          if (code === 0) { 
            resolve();
          }
        });
      } else {
        // open web browser
        open(url, function() {
          resolve();
        });
      }
    } catch(e) {
      reject(e);
    }
  });
};

/**
 * Open a specific path in the editor
 * @param  {String} path - path to open
 * @return {Nothing}      
 */
EditorService.prototype.open = function(path) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!self.client.supportedEditors[self.editor]) {
      return reject(new Error('Editor not supported.'));
    }
    var editorExe = spawn(self.client.supportedEditors[self.editor], [ path ]);
    editorExe.stdout.on('data', function (data) {
      logger.debug('editorExe STDOUT:');
      logger.debug(data);
    });

    editorExe.stderr.on('data', function (data) {
      logger.error('Result of path open in editor: ');
      logger.error(data);
      return reject(new Error('Could not open in editor'));
    });

    editorExe.on('close', function(code) {
      logger.debug('editorExe close: ');
      logger.debug(code);
      if (code !== 0) {
        reject(new Error('Could not open path in '+self.editor+'. Check your MavensMate global settings to ensure editor paths are configured properly for '+self.editor));
      } else {
        resolve();        
      }
    });

    editorExe.on('error', function(err) {
      return reject(err);
    });
  });
};

module.exports = EditorService;