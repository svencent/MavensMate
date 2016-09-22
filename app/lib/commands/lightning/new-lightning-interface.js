/**
 * @file Creates a new lightning interface/opens the new lightning interface ui
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
var MavensMateFile    = require('../../file').MavensMateFile;
var path              = require('path');
var RefreshDelegate   = require('../../refresh/delegate');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {

      self.editorService.launchUI('lightning/interface/new', { pid: self.getProject().id })
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      var project = self.getProject();
      var lightningService = new LightningService(project);
      var apiName = self.payload.apiName;
      var newAuraFile;
      var newBundleId;
      return lightningService.createBundle(apiName, self.payload.description)
        .then(function(result) {
          newBundleId = result.id;
          var createPromises = [];
          createPromises.push(lightningService.createInterface(newBundleId));
          return Promise.all(createPromises);
        })
        .then(function(result) {
          var failures = _.where(result, { 'success': false });
          if (failures.length > 0) {
            lightningService.deleteBundle(newBundleId)
              .then(function() {
                throw new Error(JSON.stringify(failures));
              });
          } else {
            newAuraFile = new MavensMateFile({ project: project, path: path.join(project.path, 'src', 'aura', apiName) });
            newAuraFile.writeToDiskSync();
            project.packageXml.subscribe(newAuraFile);
            return project.packageXml.writeFileSync();
          }
        })
        .then(function() {
          var refreshDelegate = new RefreshDelegate(project, [ newAuraFile.path ]);
          return refreshDelegate.execute();
        })
        .then(function() {
          return project.indexLightning();
        })
        .then(function() {
          resolve('Lightning interface created successfully');
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
    .command('new-lightning-interface')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Creates new lightning interface')
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