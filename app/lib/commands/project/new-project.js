/**
 * @file Create a new local project/opens new project UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var util              = require('../../util');
var merge             = require('merge');
var Project           = require('../../project');
var BaseCommand       = require('../../command');
var SalesforceClient  = require('../../sfdc-client');
var inherits          = require('inherits');
var logger            = require('winston');
var EditorService     = require('../../services/editor');
var config            = require('../../../config');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      self.editorService.launchUI('project/new')
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      if (!self.payload.name) {
        return reject(new Error('Please specify project name'));
      }
      var project;
      var sfdcClient = new SalesforceClient(self.payload);
      sfdcClient.initialize()
        .then(function() {
          self.payload.sfdcClient = sfdcClient;
          return Project.create(self.payload);
        })
        .then(function(res) {
          project = res;
          if (self.editorService && self.editorService.editor) {
            return self.editorService.open(project.path);
          } else {
            return resolve({
              message: 'Project created successfully',
              id: project.id
            });
          }
        })
        .then(function() {
          resolve({
            message: 'Project created successfully',
            id: project.id
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
    .command('new-project')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Creates a new Salesforce1 project')
    .action(function(){
      if (this.ui) {
        logger.debug(program.commandExecutor)
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
