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
    var portNumber = process.env.MAVENSMATE_SERVER_PORT || config.get('mm_server_port');

    if (!portNumber) {
      return reject(new Error('MAVENSMATE_SERVER_PORT environment variable not set'));
    }

    var url = 'http://localhost:'+portNumber+'/app/'+self._uriMap[commandName];
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
    if (!self.editor) {
      return reject('Invalid editor');
    }
    if (self.editor.toLowerCase() === 'atom') {
      var atomLocationConfig, pathAtomLocation;
      atomLocationConfig = config.get('mm_atom_exec_path');
      try { pathAtomLocation = which.sync('atom'); } catch(e){}
      var atomPath = fs.existsSync(atomLocationConfig) ? atomLocationConfig : pathAtomLocation;
      if (atomPath) {
        var atom = spawn(atomPath, [ path ]);
        atom.stdout.on('data', function (data) {
          logger.debug('atom STDOUT:');
          logger.debug(data);
        });

        atom.stderr.on('data', function (data) {
          logger.error('Result of path open in atom: ');
          logger.error(data);
          return reject(new Error('Could not open in Atom'));
        });

        atom.on('close', function (code) {
          logger.debug('atom close: ');
          logger.debug(code);
          resolve();
        });
      } else {
        reject(new Error('Invalid atom executable. Ensure mm_atom_exec_path is configured properly.'));
      }
    } else if (self.editor.toLowerCase() === 'sublime') {
      var sublLocationConfig, pathSublLocation;
      sublLocationConfig = config.get('mm_subl_location')[util.platformConfigKey] || config.get('mm_subl_location');
      try { pathSublLocation = which.sync('subl'); } catch(e){}
      var sublPath = fs.existsSync(sublLocationConfig) ? sublLocationConfig : pathSublLocation;
      if (sublPath) {
        var subl = spawn(sublPath, [ path ]);
        subl.stdout.on('data', function (data) {
          logger.debug('subl STDOUT:');
          logger.debug(data);
        });

        subl.stderr.on('data', function (data) {
          logger.debug('Result of path open in sublime: ');
          logger.debug(data);
          return reject(new Error('Could not open in Sublime'));
        });

        subl.on('close', function (code) {
          logger.debug('subl close: ');
          logger.debug(code);
          resolve();
        });
      } else {
        reject(new Error('Could not open project/file in Sublime Text because Sublime Text command line tool could not be found on your local system. Please go to MavensMate for Sublime Text user settings and ensure mm_subl_location is pointed to the location of your Sublime Text command line tool or alias your Sublime Text command line tool to `subl`.'));
      }
    }
  });
};

module.exports = EditorService;