/* index-metadata commander component
 * To use add require('../cmds/index-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('index-metadata')
		.version('0.0.0')
		.description('Indexes project\'s metadata')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};