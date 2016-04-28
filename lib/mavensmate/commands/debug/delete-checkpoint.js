/**
 * @file Deletes a checkpoint
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');
var CheckpointService = require('../../checkpoint');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var checkpointService = new CheckpointService(project);
    checkpointService.deleteCheckpoint(self.payload.path, self.payload.lineNumber)
      .then(function(res) {
        resolve(res);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('delete-checkpoint [filePath] [lineNumber]')
    .description('Creates Apex checkpoint')
    .action(function(filePath, lineNumber){
      client.executeCommand({
        name: this._name,
        body: {
          path: filePath,
          lineNumber: lineNumber
        }
      });
    });
};