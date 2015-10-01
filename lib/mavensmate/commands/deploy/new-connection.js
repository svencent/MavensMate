/**
 * @file Creates a new org connection for the project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util').instance;
var OrgConnectionService  = require('../../org-connection');
var inherits              = require('inherits');
var BaseCommand           = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var orgConnectionService = new OrgConnectionService(project);
    orgConnectionService.add(self.payload.username, self.payload.password, self.payload.orgType, self.payload.loginUrl)
      .then(function() {
        resolve('Org connection successfully created');
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
    .command('new-connection [username] [password] [orgType]')
    .description('Adds a new deployment connection')
    .action(function(username, password, orgType){
      client.executeCommand(this._name, {
        username: username,
        password: password,
        orgType: orgType
      }); 
    });
};