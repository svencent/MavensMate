/**
 * @file Queries salesforce on behalf of the running user
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    project.sfdcClient.executeSoql(self.payload.soql)
      .then(function(res) {
        resolve(res);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('execute-soql [soql]')
    .description('Executes soql query')
    .action(function(soql){
      program.commandExecutor.execute({
        name: this._name,
        body: {
          soql: soql
        }
      });
    });
};