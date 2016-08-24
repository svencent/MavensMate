'use strict';

/**
 * nconf is used globally for config, client instantiates the necessary config files
 * import config throughout the application to share the global nconf
 */

var fs        = require('fs-extra');
var config    = require('nconf');
var defaults  = require('./default');
var util      = require('../lib/util');
var path      = require('path');
var _         = require('lodash');

function _monitor(filePath) {
  fs.watchFile(filePath, function() {
    _reload();
  });
}

function _reload() {
  config.remove('user-client');
  config.remove('default-client');
  config.remove('global');
  _init();
}

function _init() {
  config.env().argv().defaults({});

  var userSettingsPath;
  if (util.isMac()) {
    userSettingsPath = path.join(util.getHomeDirectory(), '.mavensmate-config.json');
  } else if (util.isWindows()) {
    userSettingsPath = path.join(util.getWindowsAppDataPath(), 'MavensMate', 'mavensmate-config.json');
  } else if (util.isLinux()) {
    userSettingsPath = path.join(util.getHomeDirectory(), '.config', '.mavensmate-config.json');
  }

  var defaultSettings = {};
  _.each(defaults, function(settingValue, settingKey) {
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
    fs.outputJsonSync(userSettingsPath, defaultSettings, { spaces: 2 });
  }
  config.file('user', userSettingsPath);
  _monitor(userSettingsPath);
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
}

_init();
module.exports = config;