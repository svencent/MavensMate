/**
 * @file Updates the creds for an existing org connection
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util').instance;
var OrgConnectionService  = require('../../services/org-connection');
var inherits              = require('inherits');
var BaseCommand           = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var orgConnectionService = new OrgConnectionService(project);
    orgConnectionService.update(self.payload)
      .then(function(result) {
        resolve(result);
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
    .command('update-connection [connectiondId] [username] [password] [orgType]')
    .description('Updates a new deployment connection')
    .action(function(connectiondId, username, password, orgType){
      program.commandExecutor.execute({
        name: this._name,
        body: {
          id: connectiondId,
          username: username,
          password: password,
          orgType: orgType
        }
      });
    });
};