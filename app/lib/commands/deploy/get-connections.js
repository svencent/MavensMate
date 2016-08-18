/**
 * @file Lists org connections for a project
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
    orgConnectionService.listAll()
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