/**
 * @file Creates a new apex script and places in the project's apex-scripts directory
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var BaseCommand       = require('../../command');
var inherits          = require('inherits');
var ApexScriptService = require('../../services/apex-script');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var apexScriptService = new ApexScriptService(self.getProject());
    apexScriptService.create(self.payload.name)
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
    .command('new-apex-script [scriptName]')
    .description('Creates a new apex script')
    .action(function(scriptName){
      if (scriptName) {
        program.commandExecutor.execute({
          name: this._name,
          body: { name: scriptName }
        });
      } else {
        console.error('Please specify a script name');
        process.exit(1);
      }
    });
};