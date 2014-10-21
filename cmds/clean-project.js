/* clean-project commander component
 * To use add require('../cmds/clean-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('clean-project')
		.version('0.0.0')
		.description('Retrieves metadata from server based on project package.xml file, resets session')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};