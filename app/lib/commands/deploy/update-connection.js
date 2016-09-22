/**
 * @file Updates the creds for an existing org connection
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util');
var OrgConnectionService  = require('../../services/org-connection');
var inherits              = require('inherits');
var BaseCommand           = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
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