/* clean-project commander component
 * To use add require('../cmds/clean-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');
var SalesforceClient 	= require('../lib/sfdc-client');

module.exports = function(program) {

	program
		.command('clean-project')
		.alias('clean')
		.version('0.0.0')
		.description('Retrieves metadata from server based on project package.xml file, resets session')
		.action(function(/* Args here */){
			var self = this;

			global.project = new Project();
			global.project.initialize()
				.then(function() {
					return global.project.clean();
				})
				.then(function() {
					util.respond(self, 'Project cleaned successfully');
				})
				['catch'](function(error) {
					util.respond(self, 'Could not clean project', false, error);
				})
				.done();
		});
};