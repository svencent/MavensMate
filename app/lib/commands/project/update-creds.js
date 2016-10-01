/**
 * @file Updates the creds associated with a project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    project.credentials.update(self.payload)
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
exports.addSubCommand = function(program) {
  program
    .command('update-creds [username] [password] [orgType] [loginUrl]')
    .description('Update project\'s salesfore.com credentials')
    .action(function(username, password, orgType, loginUrl){
      var payload = {
        username: username,
        password: password,
        orgType: orgType,
        loginUrl: loginUrl
      };
      program.commandExecutor.execute({
        name: this._name,
        body: payload
      });
    });
};