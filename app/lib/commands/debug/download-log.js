/**
 * @file Downloads a debug log by id
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');
var LogService  = require('../../services/log');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var logService = new LogService(project);
    logService.downloadLog(self.payload.logId)
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
    .command('download-log [logId]')
    .description('Downloads a log to your project\'s debug/logs directory')
    .action(function(logId){
      program.commandExecutor.execute({
        name: this._name,
        body: { logId: logId }
      });
    });
};