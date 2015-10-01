/**
 * @file Updates the creds associated with a project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    project.updateCreds(self.payload)
      .then(function() {
        resolve('Credentials updated successfully!');
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('update-creds [username] [password] [orgType] [loginUrl]')
    .description('Update project\'s salesfore.com credentials')
    .action(function(username, password, orgType, loginUrl){
      var payload = {
        username: username,
        password: password,
        orgType: orgType,
        loginUrl: loginUrl
      };
      client.executeCommand(this._name, payload);
    });
};