/* new_metadata commander component
 * To use add require('../cmds/new-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('new-metadata')
		.version('0.0.0')
		.description('Creates a new element of metadata')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};