'use strict';

var Promise   = require('bluebird');
var _         = require('lodash');
var which     = require('which');
var exec      = require('child_process').exec;
var spawn     = require('child_process').spawn;
var command   = require('shelly');
var logger    = require('winston');
var util      = require('./util').instance;
var config    = require('./config');
var path      = require('path');
var os        = require('os');
var open      = require('open');

/**
 * Service to handle interaction with the client's editor (sublime, atom, etc.)
 * @param {Client} client
 */
var EditorService = function(client) {
  if (!client.editor || !_.isString(client.editor)) {
    throw new Error('Could not initiate editor service. Client must contain valid editor name');
  }
  this.client = client;
};

/**
 * Maps a given command name to the uri
 * @type {Object}
 */
EditorService.prototype._uriMap = {
  'new-project' : 'project/new',
  'edit-project' : 'project/edit',
  'new-metadata' : 'metadata/new',
  'deploy' : 'deploy/new',
  'test' : 'test/new',
  'execute-apex' : 'apex/new',
  'new-lightning-app' : 'lightning/new-app',
  'new-lightning-component' : 'lightning/new-component',
  'new-lightning-event' : 'lightning/new-event',
  'new-lightning-interface' : 'lightning/new-interface'
};

/**
 * Launches the MavensMate UI in either MavensMateWindowServer.app (osx) or the web browser (Linux/Windows) 
 * @param  {String} commandName
 * @return {Nothing}
 */
EditorService.prototype.launchUI = function(commandName) {
  var self = this;
  // TODO: how to get the proper port number (command line arg vs environment variable?)
  if (os.platform() === 'darwin') {
    var windowServerPath = command(path.join(util.getAppRoot(), 'bin', 'MavensMateWindowServer.app'));
    
    var windowServerChildProcess = spawn('open', ['-n', windowServerPath, '--args', '-url', 'http://localhost:8000/app/'+self._uriMap[commandName]], {
      detached: true
    });

    windowServerChildProcess.on('close', function (code) {
      // console.log('child process exited with code ' + code);
      if (code === 0) {
        process.exit(0);
      }
    });
  } else {
    // open web browser
    open('http://localhost:8000/app/'+self._uriMap[commandName], function() {
      process.exit(0);
    });
  }
};

/**
 * Opens the specified URL in the user's browser (should probably be located in util, but oh well)
 * @param  {String} url - url to open in the browser
 */
EditorService.prototype.openUrl = function(url) {
  // var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (os.platform() === 'darwin') {    
        var browserChildProcess = spawn('open', [url], {
          detached: true
        });

        browserChildProcess.on('close', function (code) {
          if (code === 0) { 
            resolve();
            // TODO: process.exit(0); when running on CLI (client.program === true)
          }
        });
      } else {
        // open web browser
        open(url, function() {
          resolve();
          // process.exit(0);
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
  if (this.client.editor.toLowerCase() === 'atom') {
    try {
      if (which.sync('atom')) {
        exec(command(which.sync('atom'), path), function (error, stdout, stderr) {
          logger.debug('Result of path open in atom: ');
          logger.debug(error);
          logger.debug(stdout);
          logger.debug(stderr);
        });
      }
    } catch(e) {
      logger.debug('Could not open path in Atom: '+e.message+'. Attempting to use config variable to open.');

      var atomExecConfig;
      if (util.isWindows()) {
        atomExecConfig = config.get('mm_atom_exec_win');
      } else if (util.isLinux()) {
        atomExecConfig = config.get('mm_atom_exec_linux');
      } else if (util.isMac()) {
        atomExecConfig = config.get('mm_atom_exec_osx');
      }
      if (atomExecConfig) {
        try {
          exec(command(atomExecConfig, path), function (error, stdout, stderr) {
            logger.debug('Result of path open in atom: ');
            logger.debug(error);
            logger.debug(stdout);
            logger.debug(stderr);
          });
        } catch(e) {
          logger.debug('Tried to use '+atomExecConfig+ ', however could not open path');
        }
      }
    }
  } else if (this.client.editor.toLowerCase() === 'sublime') {
    // TODO
  }
};

module.exports = EditorService;