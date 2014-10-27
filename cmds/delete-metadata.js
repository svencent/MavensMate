/* delete-metadata commander component
 * To use add require('../cmds/delete-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');
var Metadata 					= require('../lib/metadata');

var Command = function(){};

Command.execute = function(command) {
	var self = command;

	var metadata;
	util.getPayload()
		.then(function() {
			global.project = new Project();
			return global.project.initialize();
		})
		.then(function() {
			metadata = Metadata.classify(global.payload.files);
			return global.project.deleteFromServer(metadata);
		})
		.then(function(result) {
			Metadata.deleteLocally(metadata);
			util.respond(self, result);	
		})
		['catch'](function(error) {
			util.respond(self, 'Could not delete metadata', false, error);
		})
		.done();
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('delete-metadata')
		.alias('delete')
		.version('0.0.0')
		.description('Deletes metadata from the salesforce.com server')
		.action(function(/* Args here */){
			Command.execute(this);
		});
};