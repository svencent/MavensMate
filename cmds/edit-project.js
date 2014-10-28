/* edit_project commander component
 * To use add require('../cmds/edit-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Renderer 					= require('../lib/ui/renderer');
var Project 					= require('../lib/project');

var Command = function(){};

Command.execute = function(command) {
	var self = command;

	if (util.isUICommand(self)) {
		var renderer = new Renderer('edit-project');
		renderer.render()
			.then(function(tmpFileLocation){
				return util.respond(self, tmpFileLocation);
			})
			['catch'](function(error) {
				return util.respond(self, 'Could not open new-project UI', false, error);
			});
	} else if (util.isHeadless()) {
		
		var jsonPayload;
		
		util.getPayload()
			.then(function(stdInResult) {
				jsonPayload = stdInResult;
				global.project = new Project();
				return global.project.initialize();
			})
			.then(function() {
				return global.project.edit(jsonPayload.package);
			})
			.then(function(result) {
				util.respond(self, result);
			})
			['catch'](function(error) {
				util.respond(self, 'Could not compile metadata', false, error);
			})
			.done();	

	} else if (util.isInteractive()) {	
		// TODO
	}		
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('edit-project')
		.alias('edit_project')
		.alias('edit')
		.option('--ui', 'Launches the default UI for the selected command.')
		.version('0.0.1')
		.description('Edits an existing project')
		.action(function(){
			Command.execute(this);			
		});	
};
