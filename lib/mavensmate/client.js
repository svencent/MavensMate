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
 * @param {Boolean} [opts.verbose] - Whether this client is verbose (will output debug statements) - production clients should not have this enabled
 * @param {Object} [opts.program] - The CLI client passes in a commander.js program instance
 */
var Client = exports.Client = function(options) {
  this.editor     = options.editor;
  this.headless   = options.headless;
  this.verbose    = options.verbose;
  this.program    = options.program;
  this.settings   = options.settings || {};
  this.serverPort = options.serverPort;
  this._projects  = [];
  this._initConfig();
  logger = require('./logger')(this);
  if (this.editor === 'atom') { //sublime starts the server separately
    this.startUIServer();   
  }
  process.env.MAVENSMATE_EDITOR = this.editor;
  logger.debug('initiated client: ');
  logger.debug(this.toString());
};

inherits(Client, events.EventEmitter);

Client.prototype.toString = function() {
  return JSON.stringify({
    editor: this.editor,
    headless: this.headless,
    verbose: this.verbose,
    // program: this.program,
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
        logger.debug('could not start local server: '+err.message);
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

Client.prototype.findProjectPathById = function(id) {
  logger.debug('findProjectPathById');
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
Client.prototype.addProject = function(projectPath, callback) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = new Project({ path: projectPath });
    var isTransient = self.isCommandLine();
    project.initialize(false, isTransient)
      .then(function(response) {
        self._projects.push(project);
        resolve(response);
      })
      .catch(function(err) {
        logger.debug('Could not add project: '+err.message+ ' -> '+err.stack);
        reject(err);
      })
      .done();
  });
};

Client.prototype.addProjectById = function(projectId, callback) {
  var self = this;
  var projectPath = self.findProjectPathById(projectId);
  if (!projectPath) {
    callback(new Error('Could not find project. Please ensure your project path exists in a valid mm_workspace'));
  }
  logger.debug('---->');
  logger.debug(projectPath);
  var project = new Project({ path: projectPath });
  var isTransient = this.isCommandLine();
  project.initialize(false, isTransient)
    .then(function(response) {
      self._projects.push(project);
      callback(null, response);
    })
    .catch(function(err) {
      logger.debug('Could not add project: '+err.message+ ' -> '+err.stack);
      callback(err);
    })
    .done();
};

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
  config.env().argv().defaults(this.settings || {});

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

    // we add literals here instead of config.file bc we need to strip comments from the json before adding to the store
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
      if (atomSettings['*'] && atomSettings['*'] && atomSettings['*']['MavensMate-Atom']) {
        config
          .add('user-client', { type: 'literal', store: atomSettings['*']['MavensMate-Atom'] });  
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
Client.prototype.executeCommandForProject = function(projectOrProjectId, command, payload, callback) {
  logger.info('\n\n==================> executing command: '+command+'\n');
  // if user did not pass in context, the second param is the callback
  if (arguments.length === 3 && _.isFunction(payload)) {
    callback = payload;
    payload = {};
  }
  logger.debug('payload is: '+JSON.stringify(payload));
  var commandClass = up.capitalize(up.camelize(command))+'Command'; // => new-project -> NewProjectCommand
  logger.debug('command class is: '+commandClass);
  var commandInstance = new Client[commandClass](this, payload, callback);
  if (_.isString(projectOrProjectId)) {
    var project = this.getProject(projectOrProjectId);
    commandInstance.setProject(project);
  } else if (_.isObject(projectOrProjectId)) {
    commandInstance.setProject(projectOrProjectId);
  } else {
    commandInstance.setProject(this.getProjects()[0]);
  }
  return commandInstance.execute();
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
    logger.debug('command class is: '+commandClass);
    var commandInstance = new Client[commandClass](self, self.getProjects()[0], payload);
    commandInstance.execute()
      .then(function(result) {
        resolve(self.handleCommandResult(result, true));
      })
      .catch(function(err) {
        reject(self.handleCommandResult(null, false, err));
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
Client.prototype.handleCommandResult = function(res, success, error) {
  // if we're headless, we need to properly format the response with JSON
  // otherwise we can just log the result
  var self = this;
  var response;
  if (!self.isCommandLine() || self.serverPort) {
    // client is likely a node client (like atom), so return a JavaScript object
    response = {};
    success = success === undefined ? true : success;
    response.result = res;
    response.success = success;
    if (!success && error) {
      response.error = error.message;
      response.stack = error.stack;
    }
    logger.debug('response: ');
    logger.debug(response);
    // if (_.isFunction(self._callback)) {
    //   if (success) {
    //     self._callback(null, response);
    //   } else {
    //     self._callback(response);
    //   }
    // } else {
    //   return response;
    // }
    return response;
  } else if (self.isHeadless() && !self.verbose) {
    // this is a standard response to a consuming terminal client (sublime)
    // response should be deserialized into a valid JSON string
    response = {};
    if (success === undefined) {
      success = true;
    }
    if (_.isArray(res)) {
      response.result = res;
      response.success = success;
    } else if (typeof res === 'object') {
      response.result = res;
      if (!_.has(res, 'success')) {
        response.success = success;
      }
    } else if (_.isString(res)) {
      response.result = res;
      response.success = success;
    }
    if (!success && error) {
      response.success = false;
      response.result = error.message;
      response.stack = error.stack;
      console.error(JSON.stringify(response));
      process.exit(1);
    } else {
      console.log(JSON.stringify(response));
      process.exit(0);
    }
  } else {
    logger.debug(res);
    if (!success && error !== undefined && error.stack !== undefined) {
      var endOfLine = require('os').EOL;
      var stackLines = error.stack.split(endOfLine);
      var errors = stackLines[0];
      _.each(errors.split('Error: '), function(e) {
        if (e.length > 0) {
          console.error(e);
        }        
      });
      if (self.verbose) {
        stackLines.shift();
        console.error(stackLines.join(endOfLine));
      }
      process.exit(1);
    } else {
      console.log(res);
      process.exit(0);
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