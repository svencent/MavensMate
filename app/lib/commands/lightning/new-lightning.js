/**
 * @file Creates a new lightning app/opens the new lightning app ui
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var util              = require('../../util');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');
var EditorService     = require('../../services/editor');
var LightningService  = require('../../services/lightning');
var RefreshDelegate   = require('../../refresh/delegate');
var path              = require('path');
var MavensMateFile    = require('../../file').MavensMateFile;

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      self.editorService.launchUI('lightning/app/new', { pid: self.getProject().id })
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      var promise = self.payload.paths ? Promise.resolve(self.payload.paths) : createUtil.mergeTemplatesAndWriteToDisk(self.getProject(), self.payload);
      promise
        .then(function(paths) {
          var createDelegate = new CreateDelegate(self.getProject(), paths);
          return createDelegate.execute();
        })
        .then(function(res) {
          resolve(res);
        })
        .catch(function(err) {
          reject(err);
        });
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('new-lightning-app')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Creates new lightning application')
    .action(function() {
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