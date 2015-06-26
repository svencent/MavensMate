/* edit_project commander component
 * To use add require('../cmds/edit-project.js')(program) to your commander.js based node executable before program.parse
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
    var editorService = new EditorService(self.client);
    editorService.launchUI('home', { pid: self.getProject().settings.id })
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
    .command('open-ui')
    .description('Launches the default ui')
    .action(function() {
      client.executeCommand(this._name);          
    }); 
};
