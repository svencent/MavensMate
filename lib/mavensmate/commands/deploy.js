/* compile-metadata commander component
 * To use add require('../commands/deploy.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util        = require('../util').instance;
var Deploy      = require('../deploy');
var inherits    = require('inherits');
var BaseCommand = require('../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;

  if (self.client.isHeadless()) {   
    var deployPayload = self.payload;
    deployPayload.project = self.getProject();
    var deploy = new Deploy(deployPayload);

    deploy.executeRemote()
      .then(function(result) {
        util.respond(self, result);
      })
      ['catch'](function(error) {
        util.respond(self, 'Could not deploy metadata', false, error);
      })
      .done();  
  }
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('deploy')
    .version('0.0.1')
    .description('Deploys metadata to one or more remote Salesforce.com orgs')
    .action(function(/* Args here */){
      util.getPayload()
        .then(function(payload) {
          client.executeCommand(this._name, payload); 
        });
    });
};