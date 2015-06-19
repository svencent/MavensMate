/* edit_project commander component
 * To use add require('../cmds/edit-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util              = require('../../util').instance;
var BaseCommand       = require('../../command');
var inherits          = require('inherits');
var EditorService     = require('../../editor');
var logger            = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  var editorService = new EditorService(self.client);
  editorService.open(self.getProject().path);
  self.respond('Success');
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('open-project')
    .alias('open')
    .description('Open a project in the editor')
    .action(function() { 
      client.executeCommand(this._name);        
    }); 
};
