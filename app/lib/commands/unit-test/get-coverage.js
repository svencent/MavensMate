/**
 * @file Returns current test coverage for the org or a given path
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var ApexTest        = require('../../services/test');
var docUtil         = require('../../document/util');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var test = new ApexTest(self.getProject());
    var commandPromise;
    if (self.payload.global) {
      commandPromise = test.getOrgWideCoverage();
    } else {
      var documents = docUtil.getDocumentsFromFilePaths(self.getProject(), self.payload.paths);
      var apexDocumentEntry = documents.apex[0].getLocalStoreProperties();
      test.apexClassOrTriggerIdToName[apexDocumentEntry.id] = apexDocumentEntry.fullName;
      commandPromise = test.getCoverage([ apexDocumentEntry.id ]);
    }
    commandPromise
      .then(function(res) {
        resolve(res);
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
		.command('get-coverage [apexClassOrTriggerPath]')
    .option('-g, --global', 'Org-wide coverage')
		.description('Gets coverage for a specified class')
		.action(function(apexClassOrTriggerPath){
      if (this.global) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            global: true
          }
        });
      } else {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            paths: [ apexClassOrTriggerPath ]
          }
        });
      }
		});
};