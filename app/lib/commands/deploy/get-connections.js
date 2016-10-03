/**
 * @file Lists org connections for a project
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
    deployConnections.listAll()
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
    .command('get-connections')
    .alias('list-connections')
    .description('Retrieves a list of deployment connections')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};