/**
 * @file Creates new metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util');
var mavensMateFile  = require('../../file');
var Deploy          = require('../../services/deploy');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var EditorService   = require('../../services/editor');
var path            = require('path');
var Package         = require('../../package').Package;
var temp            = require('temp');
var fs              = require('fs-extra');
var logger          = require('winston');
var createUtil      = require('../../create/util');
var CreateDelegate  = require('../../create/delegate');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      var type = self.payload.args.type;
      var projectId = self.getProject().id;
      self.editorService.launchUI('metadata/'+type+'/new', { pid: projectId, type: type })
        .then(function() {
          resolve('Success');
        })
        .catch(function(err) {
          reject({
            message: 'Could not open new metadata UI',
            error: err
          });
        });
    } else {
      var promise = self.payload.paths ?
                      Promise.resolve(self.payload.paths) :
                      createUtil.mergeTemplatesAndWriteToDisk(self.getProject(), self.payload);
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
    .command('new-metadata')
    .option('--ui', 'Launches the default UI for the selected command.')
    .option('-t, --type [type]', 'Type of metadata to create (ApexClass, ApexPage, ApexTrigger, ApexComponent, etc.')
    .description('Creates new metadata based on supplied template and params')
    .action(function() {
      if (this.ui) {
        program.commandExecutor.execute({
          name: this._name,
          body: { args: { ui: true, type: this.type } }
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