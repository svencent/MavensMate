/* compile-project commander component
 * To use add require('../cmds/compile-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('compile-project')
		.version('0.0.0')
		.description('Attempts to compile project metadata based on package.xml')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};