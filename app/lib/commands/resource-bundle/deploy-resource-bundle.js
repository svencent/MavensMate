/**
 * @file Deploys a resource bundle to the server
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
    bundleService.deploy(self.payload.paths)
      .then(function() {
        resolve('Resource bundle successfully deployed');
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
    .command('deploy-resource-bundle [bundlePath]')
    .description('Deploys a resource bundle to the server, e.g. mavensmate deploy-resource-bundle path/to/resource/bundle ')
    .action(function(bundlePath){
      if (bundlePath) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            paths: util.getAbsolutePaths( [ bundlePath ] )
          }
        });
      } else {
        console.error('Please specify a valid bundle path');
        process.exit(1);
      }
    });
};