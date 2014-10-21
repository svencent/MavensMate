/* refresh-metadata commander component
 * To use add require('../cmds/refresh-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('refresh-metadata')
		.version('0.0.0')
		.description('Refreshes metadata from the salesforce.com server')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};