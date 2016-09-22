/**
 * @file Flushes all local soql files from a project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');
var path        = require('path');
var fs          = require('fs-extra-promise');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var soqlDirectory = path.join( project.path, 'soql' );
    if (fs.existsSync( soqlDirectory )) {
      fs.removeAsync(soqlDirectory)
        .then(function() {
          resolve('Successfully flushed soql directory');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      resolve('No soql directory detected');
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('flush-soql')
    .description('Deletes all soql files in a project')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};