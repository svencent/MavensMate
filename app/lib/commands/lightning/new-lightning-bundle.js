/**
 * @file Creates a new lightning app/opens the new lightning app ui
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise             = require('bluebird');
var _                   = require('lodash');
var inherits            = require('inherits');
var BaseCommand         = require('../../command');
var createUtil          = require('../../create/util');
var LightningCreator    = require('../../create/lightning');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var lightningCreator = new LightningCreator(self.getProject(), self.payload);
    lightningCreator.createBundle()
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('new-lightning-bundle')
    .description('Creates new lightning bundle')
    .action(function() {
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