/**
 * @file Flushes all local logs from a project
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
    var debugDirectory = path.join( project.path, 'debug' );
    if (fs.existsSync( debugDirectory )) {
      fs.removeAsync(debugDirectory)
        .then(function() {
          resolve('Successfully flushed debug logs');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      resolve('No debug directory detected');
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('flush-logs')
    .alias('delete-logs')
    .description('Deletes all log files in a project')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};