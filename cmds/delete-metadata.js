/* delete-metadata commander component
 * To use add require('../cmds/delete-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var util 							= require('../lib/util').instance;
var Project 					= require('../lib/project');

module.exports = function(program) {

	program
		.command('delete-metadata')
		.version('0.0.0')
		.description('Deletes metadata from the salesforce.com server')
		.action(function(/* Args here */){
			var self = this;

			util.getPayload()
				.then(function() {
					global.project = new Project();
					return global.project.initialize();
				})
				.then(function() {
					return global.sfdcClient.deleteMetadata(global.payload.files);
				})
				.then(function(result) {
					// todo: wipe from file system
				})
				.then(function(result) {
					util.respond(self, result);
				})
				['catch'](function(error) {
					util.respond(self, 'Could not delete metadata', false, error);
				})
				.done();	
		});
	
};