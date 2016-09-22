/**
 * @file Deletes existing trace flags and creates new trace flags for all user ids listed in a project's config/.debug file
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');
var moment      = require('moment');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var sfdcClient = project.sfdcClient;
    var expirationDate = moment().add(project.debug.get('expiration'), 'minutes');
    sfdcClient.startLogging(project.debug, expirationDate)
      .then(function() {
        resolve('Started logging for debug users');
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
    .command('start-logging')
    .description('Starts logging Apex execution for all user ids listed in your project\'s config/.debug file')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};