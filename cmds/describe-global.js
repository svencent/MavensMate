/* execute-apex commander component
 * To use add require('../cmds/execute-apex.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');

var Command = function(){};

Command.execute = function(command) {
	var self = command;

	global.project = new Project();
	global.project.initialize()
		.then(function() {
			return global.sfdcClient.describeGlobal();
		})
		.then(function(result) {
			util.respond(self, result);
		})
		['catch'](function(error) {
			util.respond(self, 'Could not descibe', false, error);
		})
		.done();	
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('describe-global')
		.version('0.0.1')
		.description('Describe your Salesforce.com environment')
		.action(function(/* Args here */){
			Command.execute(this);
		});
};