/**
 * @file Refreshes metadata from the server
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise               = require('bluebird');
var util                  = require('../../util').instance;
var inherits              = require('inherits');
var BaseCommand           = require('../../command');
var RefreshDelegate       = require('../../refresh');
var logger                = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var refreshDelegate = new RefreshDelegate(project, self.payload.paths);
    refreshDelegate.execute()
      .then(function(result) {
        logger.debug('refresh command result: ');
        logger.debug(result);
        resolve('Metadata successfully refreshed');
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
    .command('refresh-metadata [path]')
    .alias('refresh')
    .description('Refreshes metadata from the salesforce.com server')
    .action(function(path){
      if (path) {
        client.executeCommand(this._name, {
          paths : util.getAbsolutePaths( [ path ] )
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand(self._name, payload, self.parent.editor); 
          });
      }
    });
};