/**
 * @file Deploys to one or more remote targets
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util');
var RemoteDeploy    = require('../../deploy/remote');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var logger          = require('winston');
var EditorService   = require('../../services/editor');
var deployUtil      = require('../../deploy/util');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      self.editorService.launchUI('deploy/new', { pid: self.getProject().id })
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      var remoteDeploy = new RemoteDeploy(
                              self.getProject(),
                              self.payload.package,
                              self.payload.targets,
                              self.payload.deployOptions,
                              self.payload.deployName);

      remoteDeploy.execute()
        .then(function(deployResult) {
          if (self.payload.html) {
            resolve(
                deployUtil.renderDeployResult(
                  self.getProject(),
                  self.payload.targets,
                  self.payload.deployOptions,
                  deployResult
                )
            );
          } else {
            resolve(deployResult);
          }
        })
        .catch(function(error) {
          reject(error);
        });
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('deploy')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Deploys metadata to one or more remote Salesforce.com orgs')
    .action(function(/* Args here */){
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