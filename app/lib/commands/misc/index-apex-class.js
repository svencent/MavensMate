/**
 * @file Indexes the symbol tables for a given apex class
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var path          = require('path');
var Promise       = require('bluebird');
var util          = require('../../util');
var inherits      = require('inherits');
var BaseCommand   = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var apexClassName = path.basename(self.payload.className, '.cls');
    project.indexSymbols(apexClassName)
      .then(function() {
        resolve('Symbols successfully indexed for '+self.payload.className);
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
    .command('index-apex-class [className]')
    .description('Indexes Apex class\'s symbols')
    .action(function(className){
      program.commandExecutor.execute({
        name: this._name,
        body: {
          className : className
        }
      });
    });
};