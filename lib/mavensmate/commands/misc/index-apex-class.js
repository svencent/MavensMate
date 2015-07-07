/**
 * @file Indexes the symbol tables for a given apex class
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var path          = require('path');
var Promise       = require('bluebird');
var util          = require('../../util').instance;
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
    var apexClassName = path.basename(self.payload.className, '.cls');
    project.indexSymbols(apexClassName)
      .then(function() {
        resolve('Symbols successfully indexed for '+self.payload.className);
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
    .command('index-apex-class [className]')
    .description('Indexes Apex class\'s symbols')
    .action(function(className){
      client.executeCommand(this._name, {
        className : className
      }); 
    });
};