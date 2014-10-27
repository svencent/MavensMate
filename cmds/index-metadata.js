/* index-metadata commander component
 * To use add require('../cmds/index-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');
var Metadata 					= require('../lib/metadata');

module.exports = function(program) {

	program
		.command('index-metadata')
		.version('0.0.1')
		.description('Indexes project\'s metadata')
		.action(function(/* Args here */){
			var self = this;

			global.project = new Project();
			global.project.initialize()
				.then(function() {
					return Metadata.index();
				})
				.then(function(res) {
					util.respond(self, 'ok');
				})
				['catch'](function(error) {
					util.respond(self, 'Could not index metadata', false, error);
				})
				.done();
		});
	
};