/**
 * @file Returns setting value for provided key
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');
var config            = require('../../config');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
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
exports.addSubCommand = function(client) {
  client.program
    .command('get-setting [key]')
    .description('Returns the setting value for the given key')
    .action(function(key){
      client.executeCommand(this._name, {
        key: key
      });  
    });
};