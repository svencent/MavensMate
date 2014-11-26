/* refresh-metadata commander component
 * To use add require('../cmds/refresh-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util                  = require('../util').instance;
var inherits              = require('inherits');
var BaseCommand           = require('../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;

  var project = self.getProject();
  project.refreshFromServer(self.payload.files)
    .then(function() {
      self.respond('Metadata successfully refreshed');
    })
    ['catch'](function(error) {
      self.respond('Could not compile metadata', false, error);
    })
    .done();
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('refresh-metadata')
    .alias('refresh')
    .version('0.0.1')
    .description('Refreshes metadata from the salesforce.com server')
    .action(function(/* Args here */){
      var self = this;
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(self._name, payload); 
        });  
    });
};