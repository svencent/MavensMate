/**
 * @file Syncs a local piece of Apex/VF/Lightning metadata with the server
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util').instance;
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var SyncDelegate    = require('../../sync');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var syncDelegate = new SyncDelegate(project, self.payload.path);
    syncDelegate.execute()
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
    .command('sync-with-server [path]')
    .description('Syncs the local path with the server')
    .action(function(path){
      if (path) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            path : util.getAbsolutePaths( [ path ] )[0]
          }
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            program.commandExecutor.execute({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};