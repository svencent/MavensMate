/**
 * @file Executes anonymous Apex
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var util              = require('../../util').instance;
var BaseCommand       = require('../../command');
var inherits          = require('inherits');
var EditorService     = require('../../services/editor');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      var editorService = new EditorService(self.client, self.editor);
      editorService.launchUI('execute-apex', { pid: self.getProject().settings.id });
      resolve('Success');
    } else {
      self.getProject().sfdcClient.executeApex(self.payload)
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
    .command('execute-apex')
    .option('--ui', 'Launches the Apex execute anonymous UI.')
    .description('Execute Apex code anonymously')
    .action(function(/* Args here */){
      if (this.ui) {
        client.executeCommand({
          name: this._name,
          body: { args: { ui: true } },
          editor: this.parent.editor
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};