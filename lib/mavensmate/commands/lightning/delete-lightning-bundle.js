/* compile-metadata commander component
 * To use add require('../cmds/delete-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var util        = require('../../util').instance;
var inherits    = require('inherits');
var BaseCommand = require('../../command');
var Metadata    = require('../../metadata').Metadata;

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  
  var project = self.getProject();
  var payload = self.payload;
  payload.project = project;

  var pathsToDelete = payload.paths;
  var metadataArray = [];
  _.each(pathsToDelete, function(p) {
    metadataArray.push(new Metadata({ path: p, project: project }));
  });
  
  var deleteResult;
  self.metadataService.getMetadataFromPaths(self.payload.paths, project)
    .then(function(metadata) {
      return project.deleteFromServer(metadata);
    })
    .then(function(result) {
      deleteResult = result;
      if (result.success) {
        project.packageXml.unsubscribe(metadataArray); 
        return project.packageXml.writeFile();
      } else {
        return new Promise(function(resolve, reject) {
          resolve();
        });
      }
    })
    .then(function() {
      self.respond(deleteResult);
    })
    .catch(function(error) {
      self.respond('Could not delete metadata', false, error);
    })
    .done();
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('delete-lightning-bundle')
    .alias('delete')
    .version('0.0.1')
    .description('Deletes metadata from the salesforce.com server')
    .action(function(/* Args here */){
      var self = this;
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(self._name, payload); 
        });
    });
};