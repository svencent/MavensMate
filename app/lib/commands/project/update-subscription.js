/**
 * @file Updates the subscription associated with a project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var util        = require('../../util');
var inherits    = require('inherits');
var BaseCommand = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var project = self.getProject();
      project.writeSettings({ subscription: self.payload.subscription });
      resolve('Subscription updated successfully!');
    } catch(err) {
      reject(err);
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('update-subscription')
    .description('Updates project metadata subscription')
    .action(function(/* Args here */){
      var self = this;
      util.getPayload()
        .then(function(payload) {
          program.commandExecutor.execute({
            name: self._name,
            body: payload,
            editor: self.parent.editor
          });
        });
    });
};