/**
 * @file Indexes server metadata locally
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise       = require('bluebird');
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
    project.serverStore.refresh(project.sfdcClient, project.projectJson.get('subscription'))
      .then(function() {
        resolve('Metadata successfully indexed');
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
    .command('index-metadata')
    .description('Indexes project\'s metadata')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};