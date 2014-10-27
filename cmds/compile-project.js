/* compile-project commander component
 * To use add require('../cmds/compile-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');

module.exports = function(program) {

	program
		.command('compile-project')
		.version('0.0.1')
		.description('Attempts to compile project metadata based on package.xml')
		.action(function() {
			var self = this;

			global.project = new Project();
			global.project.initialize()
				.then(function() {
					return global.project.compile();
				})
				.then(function(result) {
					if (result.success) {
						util.respond(self, 'Project compiled successfully');
					} else {
						util.respond(self, 'Compile failed', false, result);
					}
				})
				['catch'](function(error) {
					util.respond(self, 'Could not compile project', false, error);
				})
				.done();
		});
	
};