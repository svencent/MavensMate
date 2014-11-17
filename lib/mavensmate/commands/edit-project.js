/* edit_project commander component
 * To use add require('../cmds/edit-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util              = require('../util').instance;
var BaseCommand       = require('../command');
var inherits          = require('inherits');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;

  if (self.client.isHeadless()) {   
    self.getProject().edit(self.payload.package)
      .then(function() {
        self.respond('Project updated successfully!');
      })
      ['catch'](function(error) {
        self.respond('Could not compile metadata', false, error);
      })
      .done();  
  } else if (util.isInteractive()) {  
    // TODO
    self.respond('This command does not support interactive shell', false, new Error('command not supported'));
  }   
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('edit-project')
    .alias('edit_project')
    .alias('edit')
    .option('--ui', 'Launches the default UI for the selected command.')
    .version('0.0.1')
    .description('Edits an existing project')
    .action(function(){
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(this._name, payload); 
        });       
    }); 
};
