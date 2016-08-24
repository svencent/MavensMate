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

var _getSobjectList = function(describeResult) {
  var sobjects = [];
  _.each(describeResult.sobjects, function(so) {
    sobjects.push(so.name);
  });
  return sobjects;
};

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
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
      var newProject;
      var sfdcClient = new SalesforceClient(self.payload);
      sfdcClient.initialize()
        .then(function() {
          newProject = new Project(self.payload);
          newProject.sfdcClient = sfdcClient;
          return newProject.initialize(true);
        })
        .then(function() {
          logger.debug('Initiated new project, prepping to write to disk');
          return newProject.retrieveAndWriteToDisk();
        })
        .then(function() {
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
          resolve({
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
