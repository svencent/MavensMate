/**
 * @file Opens the fix project UI
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
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.editorService.launchUI('project/'+self.getProject().id+'/auth', { pid: self.getProject().id })
      .then(function() {
        resolve('Please authenticate with Salesforce');
      })
      .catch(function(err) {
        reject(error);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('oauth-project')
    .description('Displays oauth UI for project')
    .action(function(){
      program.commandExecutor.execute({
        name: this._name,
        body: { args: { ui: true } },
        editor: this.parent.editor
      });
    });
};
