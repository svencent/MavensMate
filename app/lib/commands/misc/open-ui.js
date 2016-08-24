/**
 * @file Opens the MavensMate UI in a browser
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var util              = require('../../util');
var BaseCommand       = require('../../command');
var inherits          = require('inherits');
var EditorService     = require('../../services/editor');
var logger            = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {

    var urlParams = self.getProject() ? { pid: self.getProject().settings.id } : undefined;
    self.editorService.launchUI('home', urlParams)
      .then(function() {
        resolve('Success');
      })
      .catch(function(error) {
        reject(error);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('open-ui')
    .description('Launches the default ui')
    .action(function() {
      program.commandExecutor.execute({
        name: this._name
      });
    });
};
