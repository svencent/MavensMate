/**
 * @file Compiles project based on package.xml
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
    project.compile()
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
    .command('compile-project')
    .description('Compiles project based on package.xml')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};