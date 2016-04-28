/**
 * @file Opens existing metadata in the Salesforce UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise             = require('bluebird');
var inherits            = require('inherits');
var BaseCommand         = require('../../command');
var EditorService       = require('../../editor');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var editorService = new EditorService(self.client, self.editor);
    var setupUrl = project.sfdcClient.getInstanceUrl() + '/secur/frontdoor.jsp?sid=' + project.sfdcClient.getAccessToken() + '&retURL=/setup/forcecomHomepage.apexp?setupid=ForceCom';
    editorService.openUrl(setupUrl)
      .then(function() {
        resolve('Success');
      })
      .catch(function(error) {
        reject(error);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('open-sfdc')
    .description('Opens salesforce developer home page in the browser')
    .action(function(){
      client.executeCommand({
        name: this._name
      });
    });
};