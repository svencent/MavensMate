/**
 * @file Compiles metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var CompileDelegate = require('../../compile/delegate');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var compileDelegate = new CompileDelegate(project, self.payload.paths, self.payload.force);
    compileDelegate.execute()
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
    .command('compile-metadata [path]')
    .alias('compile')
    .description('Compiles metadata')
    .action(function(path){
      if (path) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            paths : util.getAbsolutePaths( [ path ] )
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