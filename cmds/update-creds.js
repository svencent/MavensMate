/* update-creds commander component
 * To use add require('../cmds/update-creds.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('update-creds')
		.version('0.0.0')
		.description('Update project\'s salesfore.com credentials')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};