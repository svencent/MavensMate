/**
 * @file Returns the medadata index for a project
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
    project.packageXml.refreshContentsFromDisk()
      .then(function() {
        resolve(project.serverStore.getSelected(project.packageXml.contents));
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('get-metadata-index')
    .description('Returns indexed metadata')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};