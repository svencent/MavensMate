/**
 * @file Returns an active salesforce session
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util').instance;
var inherits              = require('inherits');
var BaseCommand           = require('../../command');
var SalesforceClient      = require('../../sfdc-client');
var IndexService          = require('../../index');
var _                     = require('lodash');
var logger                = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('payload', self.payload);
    var sfdcClient = new SalesforceClient({
      accessToken: self.payload.accessToken,
      instanceUrl: self.payload.instanceUrl,
      transient: true
    });
    sfdcClient.initialize()
      .then(function() {
        var indexService = new IndexService({ sfdcClient: sfdcClient });
        return indexService.indexServerProperties(self.payload.metadataTypes);
      })
      .then(function(index) {
        resolve(index);
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
    .command('list-metadata [typeXmlName')
    .description('Lists metadata for given type')
    .action(function(typeXmlName) {
      if (typeXmlName) {
        client.executeCommand({
          name: this._name,
          body: {
           metadataTypes: [typeXmlName]
          }
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};