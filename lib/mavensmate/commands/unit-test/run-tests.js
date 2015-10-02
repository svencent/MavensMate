/**
 * @file Runs apex unit tests/opens the test runner UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _               = require('lodash');
var Promise         = require('bluebird');
var util            = require('../../util').instance;
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var ApexTest        = require('../../test');
var EditorService   = require('../../editor');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      var editorService = new EditorService(self.client, self.editor);
      var urlParams = { pid: self.getProject().settings.id };
      if (self.payload && self.payload.classes && _.isArray(self.payload.classes)) {
        urlParams.className = [ self.payload.classes[0] ];
      }
      editorService.launchUI('run-tests', urlParams)
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      self.payload.project = self.getProject(); 
      var test = new ApexTest(self.payload);
      test.execute()
        .then(function(testResults) {
          resolve(testResults);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    }
  }); 
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('run-tests [testPath]')
    .alias('test')
    .option('--ui', 'Launches the Apex test runner UI.')
    .description('Runs Apex unit tests')
    .action(function(testPath){
      if (this.ui) {
        client.executeCommand(this._name, { args: { ui: true } }, this.parent.editor);    
      } else {
        var self = this;
        if (testPath) {
          var payload = { tests : [ testPath ] };
          client.executeCommand(self._name, payload, self.parent.editor); 
        } else {
          util.getPayload()
            .then(function(payload) {
              client.executeCommand(self._name, payload, self.parent.editor); 
            });
        }
      }  
    });
};