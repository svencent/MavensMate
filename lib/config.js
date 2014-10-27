/* Adds 
 * Adds config command to commander.js program.
 */

'use strict';
var Q         = require('q');
var path      = require('path');
var util      = require('./util').instance;
var nconf     = require('nconf');

function Config(program) {
  this.program = program;
}

String.prototype.endsWith = function(suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

Config.prototype.initialize = function() {
  var deferred = Q.defer();
  var self = this;
  this.loadClientSettings()
    .then(function() {
      nconf.file('global', path.join(global.appRoot,'config','default.json'));
      self.program
        .command('config [key] [value]')
        .description('Get and set options')
        .action(self._config);

      global.config = nconf; //make configuration available to all command/subcommands
      util.normalizeApiVersion();
      deferred.resolve();
    })
    ['catch'](function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
};

// action handler for config command
Config.prototype._config = function(key, value) {
  if (key && value !== null) {
    if (value === '') {
      nconf.clear(key);
    } else {
      nconf.set(key, value);
    }
    nconf.save();
  } else if (key) {
    global.logger.debug('Retrieving key',key);
  } else {
    global.logger.debug('Listing all kay-values');
  }
};

Config.prototype.loadClientSettings = function() {
  var deferred = Q.defer();
  if (util.getClient() !== undefined) {
    if (util.getClient().toLowerCase() === 'atom') {
      // ATOM pipes settings in with each command, we can set them here as defaults
      nconf.defaults(global.payload.settings || {});
      deferred.resolve();
    } else if (util.getClient().toLowerCase().indexOf('sublime') >= 0) {
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
      nconf
        .add('user-client', {type: 'literal', store: util.getFileBody(userClientSettingsPath, true)})
        .add('default-client', { type: 'literal', store: util.getFileBody(defaultClientSettingsPath, true)});    
      deferred.resolve();
    } else {
      deferred.resolve();
    }   
  } else {
    deferred.resolve();
  }
  return deferred.promise;
};  


module.exports = function(program) {
  var deferred = Q.defer();
  var config = new Config(program);
  config.initialize()
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(error) {
      deferred.reject(error);
    });
  return deferred.promise;
};