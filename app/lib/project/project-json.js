var path    = require('path');
var fs      = require('fs-extra-promise');
var config  = require('../../config');
var util    = require('../util');

var ProjectJson = function(project) {
  this._path = path.join(project.path, '.mavensmate', 'project.json');
  this._state = util.getFileBody(this._path, true);
  this._watch();
};

ProjectJson.create = function(projectPath, sfdcClient, settings) {
  var projectJsonPath = path.join(projectPath, '.mavensmate', 'project.json');
  var body = {
    projectName: settings.projectName,
    username: sfdcClient.username,
    id: settings.id,
    namespace: sfdcClient.getNamespace(),
    orgType: sfdcClient.getOrgType(),
    loginUrl: sfdcClient.getLoginUrl(),
    instanceUrl: sfdcClient.getInstanceUrl(),
    workspace: settings.workspace,
    subscription: settings.subscription
  }
  fs.outputFileSync(projectJsonPath, JSON.stringify(body, null, 4));
};

ProjectJson.prototype._watch = function() {
  var self = this;
  fs.watchFile(self._path, function() {
    self._state = util.getFileBody(this._path, true);
  });
};

ProjectJson.prototype.get = function(key) {
  return this._state[key];
};

ProjectJson.prototype.set = function(settings) {
  for (var key in settings) {
    this._state[key] = settings[key];
  }
  fs.outputFileSync(this._path, JSON.stringify(this._state, null, 4));
}

module.exports = ProjectJson;