/* compile-metadata commander component
 * To use add require('../cmds/new-connection.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util                    = require('../../util').instance;
var ResourceBundleService   = require('../../resource-bundle');
var inherits                = require('inherits');
var BaseCommand             = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;

  var project = self.getProject();
  var bundleService = new ResourceBundleService(project);
  self.metadataService.getMetadataFromPaths(self.payload.paths, project)
    .then(function(metadata) {
      return bundleService.create(metadata);     
    })
    .then(function() {
      self.respond('Resource bundle(s) successfully created');
    })
    .catch(function(error) {
      self.respond('Could not create resource bundle', false, error);
    })
    .done();  
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('new-resource-bundle')
    .version('0.0.1')
    .description('Creates a resource bundle from a static resource, e.g. mavensmate new-resource-bundle <<< \'{"files":["path/to/static/resource"]}\' ')
    .action(function(/* Args here */){
      var self = this;
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(self._name, payload); 
        });
    });
};