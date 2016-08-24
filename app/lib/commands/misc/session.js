/**
 * @file Returns an active salesforce session
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util');
var inherits              = require('inherits');
var BaseCommand           = require('../../command');
var SalesforceClient      = require('../../sfdc-client');
var IndexService          = require('../../services/index');
var config                = require('../../../config');
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
        var response = {
          sid: sfdcClient.conn.accessToken,
          urls: sfdcClient.conn.userInfo.urls,
          instanceUrl: sfdcClient.conn.instanceUrl,
          username: sfdcClient.conn.userInfo.username,
          metadataTypes: _.sortBy(sfdcClient.describeCache.metadataObjects, 'xmlName')
        };
        if (process.title === 'mavensmate cli') {
          config.set('mm_cli_salesforce_session_id', response.sid);
          config.set('mm_cli_salesforce_instance_url', response.instanceUrl);
          config.save(function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          });
        } else {
          resolve(response);
        }
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
    .command('session [username] [password] [orgType]')
    .alias('get-active-session')
    .alias('login')
    .option('--verbose', 'Returns server urls and describe information')
    .description('Creates new salesforce.com session, returns session id')
    .action(function(username, password, orgType) {
      if (username && password) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            username : username,
            password: password,
            orgType: orgType || 'developer'
          }
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