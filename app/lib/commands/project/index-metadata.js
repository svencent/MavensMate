/**
 * @file Indexes server metadata locally
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise       = require('bluebird');
var inherits      = require('inherits');
var BaseCommand   = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    project.indexMetadata()
      .then(function() {
        resolve('Metadata successfully indexed');
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('index-metadata')
    .description('Indexes project\'s metadata')
    .action(function(/* Args here */){
      client.executeCommand({
        name: this._name
      });
    });
};