/* index-metadata commander component
 * To use add require('../cmds/index-metadata.js')(program) to your commander.js based node executable before program.parse
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
			return global.project.indexMetadata();
		})
		.then(function() {
			util.respond(self, 'Metadata successfully indexed');
		})
		['catch'](function(error) {
			util.respond(self, 'Could not index metadata', false, error);
		})
		.done();
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('index-metadata')
		.version('0.0.1')
		.description('Indexes project\'s metadata')
		.action(function(/* Args here */){
			Command.execute(this);	
		});
};