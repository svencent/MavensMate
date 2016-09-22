// watch sfdc client, update users

var path    = require('path');
var fs      = require('fs-extra-promise');
var config  = require('../../config');
var util    = require('../util');

var Debug = function(project) {
  this._path = path.join(project.path, '.mavensmate', 'debug.json');
  this._state = util.getFileBodySync(this._path, true);
  this._watch();
};

Debug.create = function(projectPath, sfdcClient) {
  var projectDebugPath = path.join(projectPath, '.mavensmate', 'debug.json');
  var body = {
    users: [sfdcClient.getUserId()],
    logType: 'USER_DEBUG',
    debugLevelName: 'MAVENSMATE',
    levels: {
      Workflow: 'INFO',
      Callout: 'INFO',
      System: 'DEBUG',
      Database: 'INFO',
      ApexCode: 'DEBUG',
      ApexProfiling: 'INFO',
      Validation: 'INFO',
      Visualforce: 'DEBUG'
    },
    expiration: 480
  };
  fs.outputFileSync(projectDebugPath, JSON.stringify(body, null, 4));
};

Debug.prototype._watch = function() {
  var self = this;
  fs.watchFile(self._path, function() {
    self._state = util.getFileBodySync(this._path, true);
  });
};

Debug.prototype.get = function(key) {
  return this._state[key];
};

Debug.prototype.set = function(settings) {
  for (var key in settings) {
    this._state[key] = settings[key];
  }
  fs.outputFileSync(this._path, JSON.stringify(this._state, null, 4));
}

module.exports = Debug;