/**
 * @file Updates a project's local contents based on new package.xml subscription
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
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
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      var editorService = new EditorService(self.client, self.editor);
      editorService.launchUI('edit-project', { pid: self.getProject().settings.id })
        .then(function() {
          resolve('Success');
        })
        .catch(function(err) {
          reject(error);
        })   
    } else {   
      self.getProject().edit(self.payload.package)
        .then(function() {
          resolve('Project updated successfully!');
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
    .command('edit-project')
    .alias('edit')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Edits an existing project')
    .action(function(){ 
      if (this.ui) {
        client.executeCommand(this._name, { args: { ui: true } }, this.parent.editor);    
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand(self._name, payload, self.parent.editor); 
          });
      }         
    }); 
};
