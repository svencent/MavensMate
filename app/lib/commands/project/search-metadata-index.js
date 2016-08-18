/**
 * @file Returns the medadata index for a project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.getProject().getOrgMetadataIndexWithSelections(self.payload.keyword, self.payload.ids)
      .then(function(metadataIndex) {
        resolve(metadataIndex);
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