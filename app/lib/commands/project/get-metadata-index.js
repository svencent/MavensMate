/**
 * @file Returns the selected medadata for a given package.xml
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var inherits    = require('inherits');
var BaseCommand = require('../../command');
var Package     = require('../../package');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var packagePromise;
    var myPackage;
    if (self.payload.packageXmlPath) {
      myPackage = new Package();
      packagePromise = myPackage.initializeFromPath(self.payload.packageXmlPath);
    } else {
      myPackage = project.packageXml;
      packagePromise = myPackage.refreshContentsFromDisk();
    }
    packagePromise
      .then(function() {
        resolve(project.serverStore.getSelected(myPackage.contents));
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('get-metadata-index')
    .description('Returns indexed metadata')
    .action(function(/* Args here */){
      program.commandExecutor.execute({
        name: this._name
      });
    });
};