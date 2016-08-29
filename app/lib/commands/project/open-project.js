/**
 * @file Opens the project in the client editor
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var path              = require('path');
var fs                = require('fs-extra');
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
    var editor;
    if (!self.editorService || !self.editorService.editor) {
      return reject(new Error('Please specify an editor either via "MavensMate-Editor-Agent" HTTP header, editor POST body, or -e/--editor command line flag'));
    }
    var projectPath = self.getProject().path;
    if (self.editorService.editor === 'sublime') {
      var sublimeProjectPath = path.join(projectPath, self.getProject().name+'.sublime-project');
      if (fs.existsSync(sublimeProjectPath)) {
        projectPath = sublimeProjectPath;
      }
    }
    self.editorService.open(projectPath)
      .then(function() {
        resolve('Opened project in '+self.editorService.editor);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('open-project')
    .alias('open')
    .description('Open a project in the editor')
    .action(function() {
      program.commandExecutor.execute({
        name: this._name
      });
    });
};
