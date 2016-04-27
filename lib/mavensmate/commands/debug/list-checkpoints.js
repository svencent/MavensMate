/**
 * @file Lists checkpoints for a given file
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
    checkpointService.listCheckpoints(self.payload.path)
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
    .command('new-checkpoint [filePath]')
    .description('List Apex checkpoints for filepath')
    .action(function(filePath){
      client.executeCommand({
        name: this._name,
        body: {
          path: filePath
        }
      });
    });
};