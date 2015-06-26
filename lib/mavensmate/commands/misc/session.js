/* session commander component
 * To use add require('../cmds/session.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util').instance;
var inherits              = require('inherits');
var BaseCommand           = require('../../command');
var SalesforceClient      = require('../../sfdc-client');
var IndexService          = require('../../index');
var _                     = require('lodash');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var sfdcClient = new SalesforceClient(self.payload);
    sfdcClient.initialize()
      .then(function() {
        var indexService = new IndexService({ sfdcClient: sfdcClient });
        return indexService.indexServerProperties(self.payload.subscription);
      })
      .then(function(index) {
        var response = {
          sid: sfdcClient.conn.accessToken,
          urls: sfdcClient.conn.userInfo.urls,
          metadataTypes: _.sortBy(sfdcClient.describeCache.metadataObjects, 'xmlName'),
          index: index
        };
        resolve(response);
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
    .command('session [username] [password] [orgType]')
    .alias('get-active-session')
    .option('--verbose', 'Returns server urls and describe information')
    .description('Creates new salesforce.com session, returns session id')
    .action(function(username, password, orgType) {
      if (username && password) {
        client.executeCommand(this._name, {
          username : username,
          password: password,
          orgType: orgType || 'developer'
        }); 
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand(self._name, payload); 
          });
      }
    });
};