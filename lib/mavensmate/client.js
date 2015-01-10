'use strict';

var Promise       = require('bluebird');
var _             = require('lodash');
var fs            = require('fs-extra');
var path          = require('path');
var up            = require('underscore-plus');
var inherits      = require('inherits');
var events        = require('events');
var config        = require('./config');
var Project       = require('./project');
var util          = require('./util').instance;
var UIServer      = require('./ui/server');
var logger;

// TODO: convert getters/setters to Object.defineProperty

/**
 * Each consumer of the mavensmate API instantiates a client. 
 * **** Today, there is a 1:1 relationship between client and project (per the ATOM project design)
 * @param {Object} options [description]
 * @param {String} [opts.editor] - Name of the consuming editor (atom, sublime, etc.)
 * @param {String} [opts.settings] - Settings object (atom uses this)
 * @param {Boolean} [opts.headless] - Whether this client is headless or not (atom, sublime are headless, interactive terminals users are not)
 * @param {Boolean} [opts.debugging] - Whether this client is debugging (will output debug statements) - production clients should not have this enabled
 * @param {Object} [opts.program] - The CLI client passes in a commander.js program instance
 */
var Client = exports.Client = function(options) {
  this.editor     = options.editor;
  this.headless   = options.headless;
  this.debugging  = options.debugging;
  this.program    = options.program;
  this.settings   = options.settings || {};
  this._initConfig();
  logger = require('./logger')(this);
  this._startUIServer();
  logger.debug('initiated client: ');
  logger.debug(this);
  // if (options.promisify) {
  //   Promise.promisify(Client.prototype.setProject);
  //   Promise.promisify(Client.prototype.executeCommand);
  // }
};

inherits(Client, events.EventEmitter);

/**
 * Whether the client is interacting via the command line
 * @return {Boolean}
 */
Client.prototype.isCommandLine = function() {
  return this.program !== undefined && this.program !== null;
};

/**
 * Whether the client is headless (an editor plugging into the core mavensmate APIs like atom or sublime)
 * @return {Boolean}
 */
Client.prototype.isHeadless = function() {
  return this.headless;
};

/**
 * Whether the client is interactive (a human at a terminal)
 * @return {Boolean}
 */
Client.prototype.isInteractive = function() {
  return !this.isHeadless();
};

/**
 * Whether the client is debugging. Debugging should be used for development only
 * @return {Boolean}
 */
Client.prototype.isDebugging = function() {
  return this.debugging;
};

/**
 * Starts the local express.js UI server
 * @return {Nothing}
 */
Client.prototype._startUIServer = function() {
  this._server = new UIServer(this);
  this._server.start()
    .then(function(port) {
      logger.debug('mavensmate local express server listening on port: ' + port);
    })
    .catch(function(err) {
      logger.debug('could not start local server: '+err.message);
    })
    .done();
};

Client.prototype.getServer = function() {
  return this._server;
};

/**
 * Destroys the client
 * @return {Nothing}
 */
Client.prototype.destroy = function() {
  this._server.stop();
};

/**
 * Returns the project associated with the client (currently a 1:1 relationship as per the Atom project model)
 * @return {Object} - Project instance
 */
Client.prototype.getProject = function() {
  return this._project;
};

/**
 * Sets the MavensMate project for the client
 * @param {String} path - local path of the project, reverts to process.cwd()
 * @param {Function} callback
 */
Client.prototype.setProject = function(path, callback) {
  this._project = new Project({ path: path });
  if (!this._project.initialized) {
    this._project.initialize()
      .then(function(response) {
        callback(null, response);
      })
      .catch(function(err) {
        logger.debug('Could not set project: '+err.message+ ' -> '+err.stack);
        callback(err);
      })
      .done();
  } else {
    callback(null, this._project);
  }
};

/**
 * Setup config with editor-specific settings, then globals
 * @return {Nothing}
 */
Client.prototype._initConfig = function() {
  config.defaults(this.settings || {});

  if (this.editor.toLowerCase().indexOf('sublime') >= 0) {
    var defaultClientSettingsPath;
    var userClientSettingsPath;
    if (util.isMac()) {
      defaultClientSettingsPath = path.join(util.getHomeDirectory(), 'Library', 'Application Support', 'Sublime Text 3', 'Packages', 'MavensMate', 'mavensmate.sublime-settings');
      userClientSettingsPath = path.join(util.getHomeDirectory(), 'Library', 'Application Support', 'Sublime Text 3', 'Packages', 'User', 'mavensmate.sublime-settings');
    } else if (util.isWindows()) {
      defaultClientSettingsPath = path.join(util.getWindowsAppDataPath(), 'Sublime Text 3', 'Packages', 'MavensMate', 'mavensmate.sublime-settings');
      userClientSettingsPath = path.join(util.getWindowsAppDataPath(), 'Sublime Text 3', 'Packages', 'User', 'mavensmate.sublime-settings');
    } else if (util.isLinux()) {
      defaultClientSettingsPath = path.join(util.getHomeDirectory(), '.config', 'sublime-text-3', 'Packages', 'MavensMate', 'mavensmate.sublime-settings');
      userClientSettingsPath = path.join(util.getHomeDirectory(), '.config', 'sublime-text-3', 'Packages', 'User', 'mavensmate.sublime-settings');
    }
    if (fs.existsSync(userClientSettingsPath)) {
      config
        .add('user-client', { type: 'literal', store: util.getFileBody(userClientSettingsPath, true) });
    }
    if (fs.existsSync(defaultClientSettingsPath)) {
      config
        .add('default-client', { type: 'literal', store: util.getFileBody(defaultClientSettingsPath, true)});    
    }
  } else if (this.editor.toLowerCase() === 'atom') {
    var CSON = require('season');
    var atomSettingsPath;
    if (util.isMac()) {
      atomSettingsPath = path.join(util.getHomeDirectory(), '.atom', 'config.cson');
    } else if (util.isWindows()) {
      atomSettingsPath = path.join(util.getHomeDirectory(), '.atom', 'config.cson');
    } else if (util.isLinux()) {
      atomSettingsPath = path.join(util.getHomeDirectory(), '.atom', 'config.cson');
    }
    if (fs.existsSync(atomSettingsPath)) {
      var atomSettings = CSON.readFileSync(atomSettingsPath);
      if (atomSettings.global && atomSettings.global['MavensMate-Atom']) {
        config
          .add('user-client', { type: 'literal', store: atomSettings.global['MavensMate-Atom'] });  
      }
    }  
  }   

  config.file('global', path.join(__dirname,'config','default.json'));

  var mmApiVersion = config.get('mm_api_version');
  if (!util.endsWith(mmApiVersion,'.0')) {
    mmApiVersion = mmApiVersion+'.0';
    config.set('mm_api_version', mmApiVersion);
  }
};

/**
 * Executes a named command
 * @param  {String}   command  - name of the command, e.g. new-project
 * @param  {Object}   options  - context : { args : { ui : true }, payload: { username: foo, password: bar } }
 * @param  {Function} callback - callback, will be called when command finishes executing
 * @return {Nothing}
 */
Client.prototype.executeCommand = function(command, payload, callback) {
  logger.debug('executing command: '+command);
  // if user did not pass in context, the second param is the callback
  if (arguments.length === 2 && _.isFunction(payload)) {
    callback = payload;
    payload = {};
  }
  logger.debug('payload is: '+JSON.stringify(payload));
  var commandClass = up.capitalize(up.camelize(command))+'Command'; // => new-project -> NewProjectCommand
  var commandInstance = new Client[commandClass](this, payload, callback);
  commandInstance.setProject(this.getProject());
  return commandInstance.execute();
};

/**
 * export command classes from lib/commands 
 */ 
var cmdPath = path.join(__dirname, 'commands');
fs.readdirSync(cmdPath).forEach(function(filename) {
  var filepath = path.join(cmdPath,filename);
  Client[up.capitalize(up.camelize(path.basename(filepath).split('.')[0])+'Command')] = require(filepath).command;
}); 

exports.createClient = function (options) {
  return new Client(options);
};