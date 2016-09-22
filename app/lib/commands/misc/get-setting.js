/**
 * @file Returns setting value for provided key
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');
var config            = require('../../../config');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    resolve({
      value: config.get(self.payload.key)
    });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('get-setting [key]')
    .description('Returns the setting value for the given key')
    .action(function(key){
      program.commandExecutor.execute({
        name: this._name,
        body: {
          key: key
        }
      });
    });
};