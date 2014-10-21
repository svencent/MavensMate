/* compile-metadata commander component
 * To use add require('../cmds/compile-metadata.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('compile-metadata')
		.version('0.0.0')
		.description('Compiles metadata')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};