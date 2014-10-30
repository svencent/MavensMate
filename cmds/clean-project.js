/* clean-project commander component
 * To use add require('../cmds/clean-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');

var Command = function(){};

Command.execute = function() {
	global.project = new Project();
	global.project.initialize()
		.then(function() {
			return global.project.clean();
		})
		.then(function() {
			util.respond('Project cleaned successfully');
		})
		['catch'](function(error) {
			util.respond('Could not clean project', false, error);
		})
		.done();
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('clean-project')
		.alias('clean')
		.version('0.0.1')
		.description('Retrieves metadata from server based on project package.xml file, resets session')
		.action(function(/* Args here */){
			Command.execute();	
		});
};