/* execute-apex commander component
 * To use add require('../cmds/execute-apex.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');

var Command = function(){};

Command.execute = function(command) {
	var self = command;

	util.getPayload()
		.then(function() {
			global.project = new Project();
			return global.project.initialize();
		})
		.then(function() {
			return global.sfdcClient.executeApex(global.payload);
		})
		.then(function(result) {
			util.respond(self, result);
		})
		['catch'](function(error) {
			util.respond(self, 'Could not execute anonymous apex', false, error);
		})
		.done();	
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('execute-apex')
		.version('0.0.1')
		.description('Execute Apex code anonymously')
		.action(function(/* Args here */){
			Command.execute(this);
		});
};