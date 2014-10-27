/* refresh-metadata commander component
 * To use add require('../cmds/refresh-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');
var Metadata 					= require('../lib/metadata');

var Command = function(){};

Command.execute = function(command) {
	var self = command;

	util.getPayload()
		.then(function() {
			global.project = new Project();
			return global.project.initialize();
		})
		.then(function() {
			var metadata = Metadata.classify(global.payload.files);
			return global.project.refreshFromServer(metadata);
		})
		.then(function() {
			util.respond(self, 'Metadata successfully refreshed');
		})
		['catch'](function(error) {
			util.respond(self, 'Could not compile metadata', false, error);
		})
		.done();
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('refresh-metadata')
		.alias('refresh')
		.version('0.0.0')
		.description('Refreshes metadata from the salesforce.com server')
		.action(function(/* Args here */){
			Command.execute(this);	
		});
};