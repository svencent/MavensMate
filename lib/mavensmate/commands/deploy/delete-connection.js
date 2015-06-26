/**
 * @file Deletes an org connection locally
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util').instance;
var OrgConnectionService  = require('../../org-connection');
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
    orgConnectionService.remove(self.payload.id)
      .then(function() {
        resolve('Successfully deleted org connection');
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
    .command('delete-connection [connectionId]')
    .description('Removes a new deployment connection')
    .action(function(connectionId){
      client.executeCommand(this._name, { id: connectionId }); 
    });
};