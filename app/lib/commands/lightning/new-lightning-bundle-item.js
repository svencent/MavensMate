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
    var lightningCreater = new LightningCreator(self.getProject(), self.payload);
    lightningCreater.createBundleItem()
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
    .command('new-lightning-item')
    .option('--ui', 'Launches the default UI for the selected command.')
    .description('Creates new lightning application')
    .action(function() {
      if (this.ui) {
        program.commandExecutor.execute({
          name: this._name,
          body: { args: { ui: true } },
          editor: this.parent.editor
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            program.commandExecutor.execute({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};