var path    = require('path');
var fs      = require('fs-extra-promise');
var config  = require('../../config');
var util    = require('../util');

var Config = function(project) {
  this._path = path.join(project.path, '.mavensmate', 'config.json');
  this._state = util.getFileBodySync(this._path, true);
  this._watch();
};

/**
 * Creates config.json for the project
 * @param  {Project} project
 * @param  {Object} settings
 * @return {Config}
 */
Config.create = function(projectPath, settings) {
  var projectConfigPath = path.join(projectPath, '.mavensmate', 'config.json');
  fs.outputFileSync(projectConfigPath, JSON.stringify(settings || {}, null, 4));
};

/**
 * Watches for config.json updates, updates _state accordingly
 * @return {Nothing}
 */
Config.prototype._watch = function() {
  var self = this;
  fs.watchFile(self._path, function() {
    self._state = util.getFileBodySync(self._path, true);
  });
};

/**
 * Returns project setting if it exists, otherwise defaults to global
 * @param  {String} key - config key
 * @return {Object}     config value
 */
Config.prototype.get = function(key) {
  if (key in this._state) {
    return this._state[key];
  } else {
    return config.get(key);
  }
};

/**
 * Sets _state and write to file
 * @param {Object} settings
 */
Config.prototype.set = function(settings) {
  for (var key in settings) {
    this._state[key] = settings[key];
  }
  fs.outputFileSync(this._path, JSON.stringify(this._state, null, 4));
}

module.exports = Config;