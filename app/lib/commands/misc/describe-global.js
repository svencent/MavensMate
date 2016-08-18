/**
 * @file Describes the org
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    project.sfdcClient.describeGlobal()
      .then(function(result) {
        self.respond(result);
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
    .command('describe-global')
    .description('Describe your Salesforce.com environment')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};