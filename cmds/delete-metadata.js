/* delete-metadata commander component
 * To use add require('../cmds/delete-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('delete-metadata')
		.version('0.0.0')
		.description('Deletes metadata from the salesforce.com server')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};