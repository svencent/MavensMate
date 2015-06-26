/* compile-metadata commander component
 * To use add require('../commands/deploy.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var Promise         = require('bluebird');
var util            = require('../../util').instance;
var Deploy          = require('../../deploy');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var logger          = require('winston');
var EditorService   = require('../../editor');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand() && self.client.editor === 'sublime') {
      var editorService = new EditorService(self.client);
      editorService.launchUI('deploy', { pid: self.getProject().settings.id })
        .then(function() {
          resolve('Success');   
        })
        .catch(function(error) {
          reject(error);
        });
    } else if (self.client.isHeadless()) {   
      var deployPayload = self.payload;
      deployPayload.project = self.getProject();
      logger.debug('initiating deploy: ');
      logger.debug(deployPayload.package);
      var deploy = new Deploy(deployPayload);

      var deployOptions = deployPayload.deployOptions || undefined;
      
      logger.debug('deploying: ');
      logger.debug('deployOptions: ');
      logger.debug(deployOptions);

      deploy.executeRemote(deployOptions)
        .then(function(result) {
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();  
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('deploy')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Deploys metadata to one or more remote Salesforce.com orgs')
    .action(function(/* Args here */){
      if (this.ui) {
        client.executeCommand(this._name, { args: { ui: true } });    
      } else if (client.isHeadless()) {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand(self._name, payload); 
          });
      }  
    });
};