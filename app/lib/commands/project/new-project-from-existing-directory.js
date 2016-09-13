/**
 * @file Create a new local project/opens new project UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var util              = require('../../util');
var Project           = require('../../project');
var BaseCommand       = require('../../command');
var SalesforceClient  = require('../../sfdc-client');
var inherits          = require('inherits');
var logger            = require('winston');
var EditorService     = require('../../services/editor');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

// TODO: implement
Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      self.editorService.launchUI('project/existing/new', { origin: self.payload.args.origin })
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      var newProject;
      var sfdcClient = new SalesforceClient(self.payload);
      sfdcClient.initialize()
        .then(function() {
          newProject = new Project(self.payload);
          newProject.sfdcClient = sfdcClient;
          return newProject.initialize(true, true);
        })
        .then(function() {
          logger.debug('New project written to disk ...');
          logger.debug('attempting to open in editor');
          if (self.editorService && self.editorService.editor) {
            return self.editorService.open(newProject.path);
          } else {
            return resolve({
              message: 'Project created successfully',
              id: newProject.id
            });
          }
        })
        .then(function() {
          return resolve({
            message: 'Project created successfully',
            id: newProject.id
          });
        })
        .catch(function(error) {
          logger.debug('Could not create project: ');
          logger.debug(error.stack);
          reject(error);
        })
        .done();
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('new-project-from-existing-directory')
    .option('--ui', 'Launches the default UI for the selected command.')
    .option('-d, --directory [directory]', 'Directory to create new mavensmate project from')
    .description('Creates a new MavensMate project from an existing directory')
    .action(function(){
      // if user has included the ui flag, launch the ui
      // else read STDIN
      if (this.ui) {
        program.commandExecutor.execute({
          name: this._name,
          body: { args: { ui: true, origin: this.directory } }
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
