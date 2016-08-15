/**
 * @file Refreshes metadata from the server
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var path                  = require('path');
var util                  = require('../../util').instance;
var inherits              = require('inherits');
var BaseCommand           = require('../../command');
var RefreshDelegate       = require('../../refresh');
var EditorService         = require('../../services/editor');
var logger                = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var paths = self.payload.paths;
    var refreshPromise;
    if (paths.length === 1 && (paths[0] === project.path || paths[0] === path.join(project.path, 'src'))) {
      logger.debug('refreshing project from server ...');
      refreshPromise = project.refreshFromServer();
    } else {
      logger.debug('refreshing paths from server ...');
      var refreshDelegate = new RefreshDelegate(project, paths);
      refreshPromise = refreshDelegate.execute();
    }
    refreshPromise
      .then(function(result) {
        logger.debug('refresh command result: ');
        logger.debug(result);
        if (self.editor === 'sublime') {
          var editorService = new EditorService(self.client, self.editor);
          editorService.runCommand('refresh_folder_list')
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
        resolve('Metadata successfully refreshed');
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('refresh-metadata [path]')
    .alias('refresh')
    .description('Refreshes metadata from the salesforce.com server')
    .action(function(path){
      if (path) {
        client.executeCommand({
          name: this._name,
          body: {
            paths : util.getAbsolutePaths( [ path ] )
          }
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};