/**
 * @file Updates a project's local contents based on new package.xml subscription
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
    if (self.isUICommand()) {
      self.editorService.launchUI('project/'+self.getProject().settings.id+'/edit', { pid: self.getProject().settings.id })
        .then(function() {
          resolve('Success');
        })
        .catch(function(err) {
          reject(error);
        })
    } else {
      self.getProject().edit(self.payload.package)
        .then(function() {
          if (self.editorService && self.editorService.editor === 'sublime') {
            self.editorService.runCommand('refresh_folder_list')
              .then(function() {
                resolve();
              })
              .catch(function(err) {
                logger.error(err);
                resolve();
              });
          } else {
            return Promise.resolve();
          }
        })
        .then(function() {
          resolve('Project updated successfully!');
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('edit-project')
    .alias('edit')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Edits an existing project')
    .action(function(){
      if (this.ui) {
        program.commandExecutor.execute({
          name: this._name,
          body: { args: { ui: true } },
          editor: this.parent.editor
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
