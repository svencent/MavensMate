/**
 * @file Opens the fix project UI
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
    var editorService = new EditorService(self.client, self.editor);
    editorService.launchUI('fix-project', { pid: self.getProject().settings.id })
      .then(function() {
        resolve('Opened fix project UI');
      })
      .catch(function(err) {
        reject(error);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('fix-project')
    .description('Fixes an existing project credentials')
    .action(function(){ 
      client.executeCommand(this._name, { args: { ui: true } }, this.parent.editor);    
    }); 
};
