/**
 * @file Deletes metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var DeleteDelegate  = require('../../delete/delegate');
var mavensMateFile  = require('../../file');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var deleteDelegate = new DeleteDelegate(self.getProject(), self.payload.paths);
    deleteDelegate.execute()
      .then(function(result) {
        resolve(result);
      })
      .catch(function(err) {
        reject(err);
      })
      .done();
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('delete-metadata [path]')
    .alias('delete')
    .description('Deletes metadata from the salesforce.com server')
    .action(function(path){
      if (path) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            paths: util.getAbsolutePaths( [ path ] )
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