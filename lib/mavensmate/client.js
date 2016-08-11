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
 * @param {String} [opts.name] - Name of the client (e.g. mavensmate-app, terminal)
 * @param {String} [opts.settings] - Settings object (atom uses this)
 * @param {Boolean} [opts.isNodeApp] - Whether this client was inited via require('mavensmate'). these clients will execute commands via client.executeCommand (atom plugin, for example)
 * @param {Boolean} [opts.isCommandLine] - Whether this client was inited via command line execution, which should write to STDOUT
 * @param {Boolean} [opts.isServer] - Whether this client is being maintained by an active server
 * @param {Boolean} [opts.verbose] - Whether this client is verbose (will output debug statements) - production clients should not have this enabled
 * @param {Object} [opts.program] - The CLI client passes in a commander.js program instance
 */
var Client = exports.Client = function(options) {
  this.name         = options.name;
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
  this._findSupportedEditors();
  logger.info('initiated client: ', this.toString());
};

inherits(Client, events.EventEmitter);

/**
 * Utility method for printing high-level client information
 * @return {String} - string representation of the client
 */
Client.prototype.toString = function() {
  return JSON.stringify({
    name: this.name,
    isServer: this.isServer,
    isNodeApp: this.isNodeApp,
    isCommandLine: this.isCommandLine(),
    settings: this.settings
  });
};

Client.prototype._findSupportedEditors = function() {
  this.supportedEditors = {};
  var atomLocationConfig = config.get('mm_atom_exec_path')[util.platformConfigKey] || config.get('mm_atom_exec_path');
  var pathAtomLocation, pathSublLocation;
  try { pathAtomLocation = which.sync('atom'); } catch(e){}
  var sublLocationConfig = config.get('mm_subl_location')[util.platformConfigKey] || config.get('mm_subl_location');
  try { pathSublLocation = which.sync('subl'); } catch(e){}
  var atomPath = fs.existsSync(atomLocationConfig) ? atomLocationConfig : pathAtomLocation;
  var sublPath = fs.existsSync(sublLocationConfig) ? sublLocationConfig : pathSublLocation;
  if (atomPath) {
    this.supportedEditors.atom = atomPath;
  }
  if (sublPath) {
    this.supportedEditors.sublime = sublPath;
  }
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
 * Returns the list of client projects
 * @return {Array} - Project instances
 */
Client.prototype.getProjects = function() {
  return this._projects;
};

/**
 * Returns the first project in the client project array
 * @return {Array} - Project instances
 */
Client.prototype.getProject = function() {
  return this._projects[0];
};

/**
 * Returns project instance by project id
 * @param  {String} id - id of the project
 * @return {Project} - Project instance
 */
Client.prototype.getProjectById = function(id) {
  if (id) {
    return _.find(this._projects, function(p) {
      return p.settings.id === id;
    });
  }
  return null;
};

/**
 * Given a project id, search given workspaces to find it on the disk
 * @param  {String} id mavensmate project id
 * @return {String}    project path
 */
Client.prototype._findProjectPathById = function(id) {
  logger.debug('_findProjectPathById');
  logger.debug(id);
  var projectPathToReturn;
  var workspaces = config.get('mm_workspace');
  if (!_.isArray(workspaces)) {
    workspaces = [workspaces];
  }
  logger.silly(workspaces);
  _.each(workspaces, function(workspacePath) {
    // /foo/bar/project
    // /foo/bar/project/config/.settings
    logger.silly(workspacePath);
    var projectPaths = util.listDirectories(workspacePath);
    logger.silly(projectPaths);
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
Client.prototype.addProjectByPath = function(projectPath, sfdcClient) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = new Project({ path: projectPath, sfdcClient: sfdcClient });
    project.initialize(false)
      .then(function(response) {
        self._projects.push(project);
        resolve(response);
      })
      .catch(function(err) {
        logger.error('Error initializing project: '+err.message+ ' -> '+err.stack);
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
      return reject(new Error('MavensMate could not find project with the id: '+projectId+'. This is likely because you are trying to open a project that does not reside in a valid mm_workspace. Please go to MavensMate-app global settings and ensure this project is located in a valid mm_workspace.'));
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
        if (err.message.indexOf('expired access/refresh token') >= 0) {
          logger.debug('Project added with invalid creds');
          self._projects.push(project);
          resolve();
        } else {
          logger.error('Error initializing project: '+err.message+ ' -> '+err.stack);
          reject(err);
        }
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

  // ensure valid JSON configuration
  try {
    util.getFileBody(userSettingsPath, true);
  } catch(e) {
    logger.error('could not parse user JSON configuration, reverting to default');
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

  if (config.get('mm_http_proxy')) {
    process.env.http_proxy = config.get('mm_http_proxy');
  }
  if (config.get('mm_https_proxy')) {
    process.env.https_proxy = config.get('mm_https_proxy');
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
 * TODO: where is this used?
 */
Client.prototype._runFinishCommands = function(project, command, body, editor) {
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
          if (path.extname(p) === '.cls') {
            finishPromises.push(
              self.executeCommand({
                project: project,
                name: 'index-apex-class',
                body: { className: p },
                editor: editor
              })
            );
          }
        });
      }
      if (c === 'index-apex') {
        finishPromises.push(
          self.executeCommand({
            project: project,
            name: 'index-apex',
            editor: editor
          })
        );
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
 * Executes a command
 * @param  {Object}   payload - object containing the following:
 * @param  {String}   payload.name  - name of the command, e.g. new-project
 * @param  {String}   payload.body  - arbitrary body of the command, e.g. { username: foo, password: bar } }
 * @param  {String}   payload.project  - project instance or project id
 * @param  {String}   payload.editor  - name of the editor, e.g. sublime, vscode, atom
 * @param  {Function} payload.callback - callback, will be called when command finishes executing
 * @return {Nothing}
 */
Client.prototype.executeCommand = function(payload) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.info('\n\n==================> executing command');
    logger.debug('payload ', payload);

    var name, body, editor, project, commandClassName;
    name = payload.name;
    body = payload.body;
    editor = payload.editor || process.env.MAVENSMATE_EDITOR;
    project = payload.project;
    commandClassName = up.capitalize(up.camelize(name))+'Command'; // => new-project -> NewProjectCommand

    if (_.isString(project)) { // likely a project id
      project = self.getProjectById(project);
    } else if (self.getProjects().length > 0) {
      project = self.getProjects()[0];
    }

    logger.debug(commandClassName);
    // logger.debug(self);

    var command = new Client[commandClassName](self, project, body, editor);

    logger.info('\n\n==================> executing command');
    logger.info('name: ', name);
    logger.info('project: ', project && project.name ? project.name : 'none');
    logger.info('body: ', JSON.stringify(body));
    logger.info('editor: ', editor || 'none');
    logger.debug('mavensmate command class name: '+commandClassName);
    logger.silly('mavensmate command instance: ', command);

    if (!Client[commandClassName]) {
      self._handleCommandResult({
        error: new Error('Command not supported: '+name),
        resolve: resolve,
        reject: reject
      });
      return;
    }

    command.execute()
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
  if (result.result) {
    logger.debug(result.result);
  } else if (result.error) {
    logger.error(result.error);
  }

  if (result.error) {
    if (this.isNodeApp || this.isServer) {
      result.reject(result.error);
    } else {
      console.error(JSON.stringify({
        error:result.error.message
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