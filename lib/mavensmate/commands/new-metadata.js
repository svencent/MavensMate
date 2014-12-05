/* new_metadata commander component
 * To use add require('../cmds/new-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util            = require('../util').instance;
var Metadata        = require('../metadata').Metadata;
var Deploy          = require('../deploy');
var inherits        = require('inherits');
var BaseCommand     = require('../command');
var EditorService   = require('../editor');
var path            = require('path');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  if (self.isUICommand() && self.client.editor === 'sublime') {
    var editorService = new EditorService(self.client);
    editorService.launchUI('execute-apex');   
  } else {
    var project = self.getProject();
    var deployResult;
    // TODO: add to packagexml
    var payload = self.payload;
    payload.project = project;
    var newMetadata = new Metadata(payload);
    var deploy = new Deploy({ project: project });
    var deployOptions = {
      rollbackOnError: true,
      performRetrieve: true
    };
    return deploy.execute(newMetadata, deployOptions)
      .then(function(result) {
        deployResult = result;
        return project.updateLocalStore(deployResult.details.retrieveResult.fileProperties);
      })
      .then(function() {
        return project.packageService.insert(newMetadata, true); // insert new metadata to package.xml, serialize, write it to the disk
      })
      .then(function() {
        if (self.client.editor) {
          var newMetadataPath = path.join(project.path, 'src', newMetadata.getType().directoryName, [newMetadata.getName(), newMetadata.getType().suffix].join('.'));
          new EditorService(self.client).open(newMetadataPath);
        } 
        self.respond(deployResult);
      })
      ['catch'](function(error) {
        self.respond('Could not create metadata', false, error);
      })
      .done(); 
  } 
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('new-metadata')
    .version('0.0.1')
    .description('Creates new metadata based on supplied template and params')
    .action(function() {
      var self = this;
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(self._name, payload); 
        });
    });
};