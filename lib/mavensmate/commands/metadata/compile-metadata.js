/**
 * @file Compiles metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util').instance;
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var CompileDelegate = require('../../compile');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var compileDelegate = new CompileDelegate(project, self.payload.paths, self.payload.force, self.client.editor);
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
exports.addSubCommand = function(client) {
  client.program
    .command('compile-metadata [path]')
    .alias('compile')
    .description('Compiles metadata')
    .action(function(path){
      if (path) {
        client.executeCommand(this._name, {
          paths : util.getAbsolutePaths( [ path ] )
        }); 
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand(self._name, payload); 
          });
      }
    });
};