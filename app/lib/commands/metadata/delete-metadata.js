/**
 * @file Deletes metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util').instance;
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var DeleteDelegate  = require('../../services/delete');
var mavensMateFile  = require('../../file');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var payload = self.payload;
    payload.project = project;
    var deleteDelegate = new DeleteDelegate(project, payload.paths);
    var deleteResult;
    deleteDelegate.execute()
      .then(function(result) {
        deleteResult = result;
        if (result.success) {
          var files = mavensMateFile.createFileInstances(payload.paths);
          project.packageXml.unsubscribe(files);
          return project.packageXml.writeFile();
        } else {
          return new Promise(function(res) {
            res();
          });
        }
      })
      .then(function() {
        resolve(deleteResult);
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
    .command('delete-metadata [path]')
    .alias('delete')
    .description('Deletes metadata from the salesforce.com server')
    .action(function(path){
      if (path) {
        client.executeCommand({
          name: this._name,
          body: {
            paths: util.getAbsolutePaths( [ path ] )
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