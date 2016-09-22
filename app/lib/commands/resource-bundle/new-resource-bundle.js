/**
 * @file Creates a new resource bundle from a given static resource path
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise                 = require('bluebird');
var util                    = require('../../util');
var ResourceBundleService   = require('../../services/resource-bundle');
var inherits                = require('inherits');
var BaseCommand             = require('../../command');

function Command() {
  BaseCommand.call(this, arguments);
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
exports.addSubCommand = function(program) {
  program
    .command('new-resource-bundle [staticResourcePath]')
    .description('Creates a resource bundle from a static resource, e.g. mavensmate new-resource-bundle path/to/static/resource')
    .action(function(staticResourcePath){
      program.commandExecutor.execute({
        name: this._name,
        body: {
          paths: util.getAbsolutePaths( [ staticResourcePath ] )
        }
      });
    });
};