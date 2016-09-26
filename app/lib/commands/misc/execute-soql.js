/**
 * @file Queries salesforce on behalf of the running user
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var inherits          = require('inherits');
var BaseCommand       = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var queryPromise = self.payload.tooling ?
                    project.sfdcClient.executeToolingSoql(self.payload.soql) :
                    project.sfdcClient.executeSoql(self.payload.soql);
    queryPromise
      .then(function(res) {
        var soqlResultFilePath = project.writeSoqlResult(res);
        resolve({
          path: soqlResultFilePath
        });
      })
      .catch(function(error) {
        reject(error);
      });
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