/**
 * @file Runs apex unit tests/opens the test runner UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

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
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('run-test-method [testNameOrPath] [testMethodName]')
    .alias('test')
    .description('Runs an Apex unit test method')
    .action(function(testNameOrPath, testMethodName) {
      var self = this;
      if (testNameOrPath && testMethodName) {
        var payload = {
          tests: [
            {
              testNameOrPath : testNameOrPath,
              methodNames: [ testMethodName ]
            }
          ]
        };
        client.executeCommand({
          name: self._name,
          body: payload,
          editor: self.parent.editor
        });
      } else {
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