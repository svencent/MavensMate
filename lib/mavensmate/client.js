/**
 * @file When the MavensMate server is running, it currently supports a single "client" that can have multiple projects associated with it
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise       = require('bluebird');
var _             = require('lodash');
var fs            = require('fs-extra');
var path          = require('path');
var up            = require('underscore-plus');
var inherits      = require('inherits');
var events        = require('events');
var config        = require('./config');
var defaultConfig = require('./config/default');
var Project       = require('./project');
var util          = require('./util').instance;
var UIServer      = require('./ui/server');
var logger;

// TODO: convert getters/setters to Object.defineProperty

/**
 * MavensMate can operate in 3 modes:
 *
 * 1. node app via require('mavensmate')
 * 2. server executing commands via localhost
 * 3. command line (e.g. mavensmate new-project --ui)
 * 
 */

/**
 * Each consumer of the mavensmate API instantiates a client. 
 * @param {Object} options [description]
 * @param {String} [opts.editor] - Name of the consuming editor (atom, sublime, etc.)
 * @param {String} [opts.settings] - Settings object (atom uses this)
 * @param {Boolean} [opts.isNodeApp] - Whether this client was inited via require('mavensmate'). these clients will execute commands via client.executeCommand (atom plugin, for example)
 * @param {Boolean} [opts.isCommandLine] - Whether this client was inited via command line execution, which should write to STDOUT
 * @param {Boolean} [opts.isServer] - Whether this client is being maintained by an active server
 * @param {Boolean} [opts.verbose] - Whether this client is verbose (will output debug statements) - production clients should not have this enabled
 * @param {Object} [opts.program] - The CLI client passes in a commander.js program instance
 */
var Client = exports.Client = function(options) {
  this.editor       = options.editor;
  this.verbose      = options.verbose;
  this.program      = options.program;
  this.settings     = options.settings || {};
  this.serverPort   = options.serverPort;
  this.isServer     = options.isServer || false;
  this.isNodeApp    = options.isNodeApp || false;
  this.windowOpener = options.windowOpener;
  this._projects  = [];
  this._initConfig();
  logger = require('./logger')(this);
  process.env.MAVENSMATE_EDITOR = this.editor;
  logger.info('initiated client: ', this.toString());
};

inherits(Client, events.EventEmitter);

Client.prototype.toString = function() {
  return JSON.stringify({
    editor: this.editor,
    isServer: this.isServer,
    isNodeApp: this.isNodeApp,
    isCommandLine: this.isCommandLine(),
    settings: this.settings
  });
};

/**
 * Whether the client is interacting via the command line
 * @return {Boolean}
 */
Client.prototype.isCommandLine = function() {
  return this.program !== undefined && this.program !== null;
};

/**
 * Starts the local express.js UI server
 * @return {Nothing}
 */
Client.prototype.startUIServer = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._server = new UIServer(self);
    self._server.start()
      .then(function(port) {
        logger.debug('mavensmate local express server listening on port: ' + port);
        process.env.MAVENSMATE_SERVER_PORT = port;
        resolve(port);
      })
      .catch(function(err) {
        logger.error('could not start local server: '+err.message);
        reject(err);
      })
      .done();
  });
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
Client.prototype.getProjects = function() {
  return this._projects;
};

Client.prototype.getProject = function(id) {
  if (id) {
    return _.find(this._projects, function(p) {
      return p.settings.id === id;
    });
  } else {
    return this.getProjects()[0];
  }
};

Client.prototype._findProjectPathById = function(id) {
  logger.debug('_findProjectPathById');
  logger.debug(id);
  var projectPathToReturn;
  var workspaces = config.get('mm_workspace');
  if (!_.isArray(workspaces)) {
    workspaces = [workspaces];
  }
  logger.debug(workspaces);
  _.each(workspaces, function(workspacePath) {
    // /foo/bar/project
    // /foo/bar/project/config/.settings
    logger.debug(workspacePath);
    var projectPaths = util.listDirectories(workspacePath);
    logger.debug(projectPaths);
    _.each(projectPaths, function(projectPath) {
      var settingsPath = path.join(projectPath, 'config', '.settings');
      if (fs.existsSync(settingsPath)) {
        var settings = util.getFileBody(settingsPath, true);
        if (settings.id === id) {
          projectPathToReturn = projectPath;
          return false;
        }
      }
    });
  });
  return projectPathToReturn;
};

/**
 * Adds the MavensMate project to the client
 * @param {String} path - local path of the project, reverts to process.cwd()
 * @param {Function} callback
 */
Client.prototype.addProject = function(projectPath, sfdcClient) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = new Project({ path: projectPath, sfdcClient: sfdcClient });
    project.initialize(false)
      .then(function(response) {
        self._projects.push(project);
        resolve(response);
      })
      .catch(function(err) {
        logger.error('Could not add project: '+err.message+ ' -> '+err.stack);
        reject(err);
      })
      .done();
  });
};

Client.prototype.addProjectById = function(projectId, sfdcClient) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var projectPath = self._findProjectPathById(projectId);
    if (!projectPath) {
      return reject(new Error('Could not find project. Please ensure your project path exists in a valid mm_workspace'));
    }
    logger.info('adding project by id ----> ', projectId);
    logger.info('path: ', projectPath);
    var project = new Project({ path: projectPath, sfdcClient: sfdcClient });
    project.initialize(false)
      .then(function(response) {
        self._projects.push(project);
        resolve(response);
      })
      .catch(function(err) {
        logger.error('Could not add project: '+err.message+ ' -> '+err.stack);
        reject(err);
      })
      .done();
  });
};

/**
 * Reinits config. Useful after a configuration file changes
 * @return {void}
 */
Client.prototype.reloadConfig = function() {
  config.remove('user-client');
  config.remove('default-client');
  config.remove('global');
  this._initConfig();
};

/**
 * Setup config with editor-specific settings, then globals
 * @return {Nothing}
 */
Client.prototype._initConfig = function() {
  var self = this;
  config.env().argv().defaults(this.settings || {});

  var userSettingsPath;
  if (util.isMac()) {
    userSettingsPath = path.join(util.getHomeDirectory(), '.mavensmate-config.json');
  } else if (util.isWindows()) {
    userSettingsPath = path.join(util.getWindowsAppDataPath(), 'MavensMate', 'mavensmate-config.json');
  } else if (util.isLinux()) {
    userSettingsPath = path.join(util.getHomeDirectory(), '.config', '.mavensmate-config.json');
  }

  var defaultSettings = {};
  _.each(defaultConfig, function(settingValue, settingKey) {
    defaultSettings[settingKey] = settingValue.default;
  });

  // if user setting dont exist, copy default to user settings on disk
  if (!fs.existsSync(userSettingsPath)) {
    fs.outputJsonSync(userSettingsPath, defaultSettings, {spaces: 2});
  }
  
  config.file('user', userSettingsPath);
  if (!self.monitoringConfig) {
    self._monitorConfigFile(userSettingsPath);    
  }
  config
    .add('global', { type: 'literal', store: defaultSettings});

  // normalize mm_api_version to string with a single decimal
  var mmApiVersion = config.get('mm_api_version');
  if (!util.endsWith(mmApiVersion,'.0')) {
    mmApiVersion = mmApiVersion+'.0';
    config.set('mm_api_version', mmApiVersion);
  }  
};

Client.prototype._monitorConfigFile = function(filePath) {
  var self = this;
  self.monitoringConfig = true;
  fs.watchFile(filePath, function() {
    self.reloadConfig();
  });
};

Client.prototype.finishCommands = {
  'compile-metadata' : [ 'index-apex-class' ],
  'new-project' : [ 'index-apex' ],
  'edit-project' : [ 'index-apex' ]
};

/**
 * Runs post-command command(s) asynchronously so as to not impact perceived performance of requested command
 * TODO: move to provider pattern
 */
Client.prototype._runFinishCommands = function(project, command, body) {
  if (body && body.args && body.args.ui) return;
  logger.info('Looking for finish command(s) for '+command);
  var self = this;
  var finishCommands = self.finishCommands;
  if (finishCommands[command]) {
    var finishCommandsForCommand = finishCommands[command];
    var finishPromises = [];
    _.each(finishCommandsForCommand, function(c) {
      if (c === 'index-apex-class') {
        _.each(body.paths, function(p) {
          finishPromises.push(self.executeCommandForProject(project, 'index-apex-class', {
            className: p
          }));
        });
      }
      if (c === 'index-apex') {
        finishPromises.push(self.executeCommandForProject(project, 'index-apex'));
      }
    });
    if (finishPromises.length > 0) {
      logger.info('Running finish commands for command: '+command, finishPromises);
      Promise.all(finishPromises)
        .then(function() {
          logger.info('Finish commands successfully run for command: '+command, body);
        })
        .catch(function() {
          logger.error('Could not run finish command(s) for command: '+command, body);
        });
    }
  }
};

/**
 * Executes a named command
 * @param  {String}   command  - name of the command, e.g. new-project
 * @param  {Object}   options  - context : { args : { ui : true }, payload: { username: foo, password: bar } }
 * @param  {Function} callback - callback, will be called when command finishes executing
 * @return {Nothing}
 */
Client.prototype.executeCommandForProject = function(projectOrProjectId, command, payload) {
  logger.info('\n\n==================> executing command: '+command+'\n');
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.info('executeCommandForProject payload is: '+JSON.stringify(payload));
    var commandClass = up.capitalize(up.camelize(command))+'Command'; // => new-project -> NewProjectCommand
    if (!Client[commandClass]) {
      self._handleCommandResult({
        error: new Error('Command not supported: '+command),
        resolve: resolve,
        reject: reject
      });
      return; 
    }
    logger.debug('command class is: '+commandClass);
    var commandInstance;
    if (_.isString(projectOrProjectId)) {
      var project = self.getProject(projectOrProjectId);
      commandInstance = new Client[commandClass](self, project, payload);
    } else if (_.isObject(projectOrProjectId)) {
      commandInstance = new Client[commandClass](self, projectOrProjectId, payload);
    } else {
      commandInstance = new Client[commandClass](self, self.getProjects()[0], payload);
    }
    commandInstance.execute()
      .then(function(result) {
        self._runFinishCommands(commandInstance.getProject(), command, payload);
        self._handleCommandResult({
          result: result,
          resolve: resolve,
          reject: reject
        });
      })
      .catch(function(error) {
        self._handleCommandResult({
          error: error,
          resolve: resolve,
          reject: reject
        });
      });
  });
};

/**
 * Executes a named command
 * @param  {String}   command  - name of the command, e.g. new-project
 * @param  {Object}   options  - context : { args : { ui : true }, payload: { username: foo, password: bar } }
 * @param  {Function} callback - callback, will be called when command finishes executing
 * @return {Nothing}
 */
Client.prototype.executeCommand = function(command, payload) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.info('\n\n==================> executing command: '+command+'\n');
    // logger.info('number of projects: ',self.getProjects().length);
    logger.debug('payload is: '+JSON.stringify(payload));
    var commandClass = up.capitalize(up.camelize(command))+'Command'; // => new-project -> NewProjectCommand
    if (!Client[commandClass]) {
      self._handleCommandResult({
        error: new Error('Command not supported: '+command),
        resolve: resolve,
        reject: reject
      });
      return; 
    }
    logger.debug('command class is: '+commandClass);
    var commandInstance = new Client[commandClass](self, self.getProjects()[0], payload);
    commandInstance.execute()
      .then(function(result) {
        self._handleCommandResult({
          result: result,
          resolve: resolve,
          reject: reject
        });
      })
      .catch(function(error) {
        self._handleCommandResult({
          error: error,
          resolve: resolve,
          reject: reject
        });
      });
  });
};


/**
 * Responses to the client that executed the command
 * @param  {Object|String} res   - response from the command
 * @param  {Boolean} success - whether the command was successfull (TODO: do we need this?)
 * @param  {Error} error   - error instance (for failed commands)
 * @return {String|Object|STDOUT}         - depends on the configuration of the client (more documentation needed here)
 */
Client.prototype._handleCommandResult = function(result) {
  // if we're headless, we need to properly format the response with JSON
  // otherwise we can just log the result
  var self = this;

  logger.info('handling command result: ');
  logger.debug(result.result || result.error);

  if (result.error) {
    if (this.isNodeApp || this.isServer) {
      result.reject(result.error);
    } else {
      console.error(JSON.stringify({
        error:result.error
      }));
      process.exit(1);
    }
  } else {
    if (_.isString(result.result)) {
      var response = {
        message: result.result
      };
      if (this.isNodeApp || this.isServer) {
        result.resolve(response);
      } else {
        console.log(JSON.stringify(response));
        process.exit(0);
      }
    } else {
      if (this.isNodeApp || this.isServer) {
        result.resolve(result.result);
      } else {
        console.log(JSON.stringify(result.result));
        process.exit(0);
      }
    }
  }
};

/**
 * export command classes from lib/commands 
 */ 
var cmdPath = path.join(__dirname, 'commands');
var commandFiles = util.walkSync(cmdPath);
_.each(commandFiles, function(filepath) {
  Client[up.capitalize(up.camelize(path.basename(filepath).split('.')[0])+'Command')] = require(filepath).command;
});

exports.createClient = function (options) {
  return new Client(options);
};