/* compile-metadata commander component
 * To use add require('../cmds/compile-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util        = require('../../util').instance;
var inherits    = require('inherits');
var BaseCommand = require('../../command');
var LogService  = require('../../log');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  
  var project = self.getProject();
  var logService = new LogService(project);
  logService.downloadLog(self.payload.logId)
    .then(function(result) {
      self.respond(result);
    })
    .catch(function(error) {
      self.respond('Could not download log', false, error);
    })
    .done();
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('download-log')
    .version('0.0.1')
    .description('Downloads a log to your project\'s debug/logs directory')
    .action(function(/* Args here */){
      var self = this;
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(self._name, payload); 
        });
    });
};