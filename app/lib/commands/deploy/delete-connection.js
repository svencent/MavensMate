/**
 * @file Deletes an org connection locally
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util');
var DeployConnections     = require('../../deploy/connections');
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
    var deployConnections = new DeployConnections(project);
    deployConnections.remove(self.payload.id)
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
exports.addSubCommand = function(program) {
  program
    .command('delete-connection [connectionId]')
    .description('Removes a new deployment connection')
    .action(function(connectionId){
      program.commandExecutor.execute({
        name: this._name,
        body: { id: connectionId }
      });
    });
};