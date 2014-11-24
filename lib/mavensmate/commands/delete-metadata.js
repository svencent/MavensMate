/* compile-metadata commander component
 * To use add require('../cmds/delete-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var Q           = require('q');
var _           = require('lodash');
var util        = require('../util').instance;
var inherits    = require('inherits');
var BaseCommand = require('../command');
var Metadata    = require('../metadata').Metadata;

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  
  var project = self.getProject();
  var payload = self.payload;
  payload.project = project;

  var filesToDelete = payload.files;
  var metadataArray = [];
  _.each(filesToDelete, function(f) {
    metadataArray.push(new Metadata({ path: f, project: project }));
  });
  
  var deleteResult;
  project.deleteFromServer(self.payload.files)
    .then(function(result) {
      deleteResult = result;
      if (result.success) {
        return project.packageService.remove(metadataArray, true); // remove metadata from package.xml, serialize, write it to the disk  
      } else {
        var deferred = Q.defer();
        deferred.resolve();
        return deferred.promise;
      }
    })
    .then(function() {
      self.respond(deleteResult);
    })
    ['catch'](function(error) {
      self.respond('Could not delete metadata', false, error);
    })
    .done();
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('delete-metadata')
    .alias('delete')
    .version('0.0.1')
    .description('Deletes metadata from the salesforce.com server')
    .action(function(/* Args here */){
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(this._name, payload); 
        });
    });
};