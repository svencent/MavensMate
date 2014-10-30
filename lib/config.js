/* Adds 
 * Adds config command to commander.js program.
 */

'use strict';
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
  var self = this;
  this._loadClientSettings();
  nconf.file('global', path.join(global.appRoot,'config','default.json'));
  if (self.program !== undefined) {
    self.program
      .command('config [key] [value]')
      .description('Get and set MavensMate options')
      .action(self._config);
  }
  global.config = nconf; //make configuration available to all command/subcommands
  util.normalizeApiVersion();
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
    // logger.debug('Retrieving key',key);
  } else {
    // logger.debug('Listing all kay-values');
  }
};

// sether and getters
Config.prototype.get = function(key){
  return nconf.get(key);
};

Config.prototype._loadClientSettings = function() {
  if (util.getClient() !== undefined) {
    if (util.getClient().toLowerCase() === 'atom') {
      // ATOM pipes settings in with each command, we can set them here as defaults
      nconf.defaults(global.payload.settings || {});
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
    }   
  }
};  

// module.exports = function(program) {
//   console.log('exporting CONFIG!!');
//   var config = new Config(program);
//   config.initialize();
//   return config;
// };
// 

var config = new Config();
config.initialize();
module.exports = config;