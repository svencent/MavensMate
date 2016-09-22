/**
 * @file Indexes all apex symbols for a given project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    project.indexSymbols()
      .then(function() {
        resolve('Symbols successfully indexed');
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
    .command('index-apex')
    .alias('index-symbols')
    .description('Indexes project\'s Apex symbols')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};