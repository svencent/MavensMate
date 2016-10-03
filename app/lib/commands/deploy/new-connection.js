/**
 * @file Creates a new org connection for the project
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
    deployConnections.add(self.payload)
      .then(function() {
        resolve('Org connection successfully created');
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
    .command('new-connection [username] [password] [orgType]')
    .description('Adds a new deployment connection')
    .action(function(username, password, orgType){
      program.commandExecutor.execute({
        name: this._name,
        body: {
          username: username,
          password: password,
          orgType: orgType
        }
      });
    });
};