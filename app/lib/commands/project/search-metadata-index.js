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
        resolve(project.serverStore.filter(self.payload.keyword, self.payload.ids));
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('search-metadata-index')
    .description('Searches metadata index')
    .action(function() {
      var self = this;
      util.getPayload()
        .then(function(payload) {
          program.commandExecutor.execute({
            name: self._name,
            body: payload,
            editor: self.parent.editor
          });
        });
    });
};