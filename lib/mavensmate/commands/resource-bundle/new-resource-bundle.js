/**
 * @file Creates a new resource bundle from a given static resource path
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise                 = require('bluebird');
var util                    = require('../../util').instance;
var ResourceBundleService   = require('../../resource-bundle');
var inherits                = require('inherits');
var BaseCommand             = require('../../command');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var project = self.getProject();
    var bundleService = new ResourceBundleService(project);
    bundleService.create(self.payload.paths)   
      .then(function() {
        resolve('Resource bundle(s) successfully created');
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
    .command('new-resource-bundle [staticResourcePath]')
    .description('Creates a resource bundle from a static resource, e.g. mavensmate new-resource-bundle path/to/static/resource')
    .action(function(staticResourcePath){
      client.executeCommand(this._name, { paths: util.getAbsolutePaths( [ staticResourcePath ] ) });
    });
};