/* get-metadata-index commander component
 * To use add require('../cmds/get-metadata-index.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('get-metadata-index')
		.version('0.0.0')
		.description('Returns indexed metadata')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};