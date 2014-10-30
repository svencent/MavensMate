/* compile-metadata commander component
 * To use add require('../cmds/compile-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');
var ApexTest 					= require('../lib/test');

var Command = function(){};

Command.execute = function(command) {
	var self = command;

	util.getPayload()
		.then(function() {
			global.project = new Project();
			return global.project.initialize();
		})
		.then(function() {
			var test = new ApexTest(global.payload);
			return test.execute();
		})
		.then(function(result) {
			util.respond(self, result);
		})
		['catch'](function(error) {
			util.respond(self, 'Could not run tests', false, error);
		})
		.done();	
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('run-tests')
		.alias('test')
		.option('--ui', 'Launches the Apex test runner UI.')
		.version('0.0.1')
		.description('Runs Apex unit tests')
		.action(function(){
			Command.execute(this);
		});
};