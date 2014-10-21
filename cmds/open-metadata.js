/* open-metadata commander component
 * To use add require('../cmds/open-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('open-metadata')
		.version('0.0.0')
		.description('Opens metadata in the salesforce.com UI')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};