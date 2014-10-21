/* upgrade-project commander component
 * To use add require('../cmds/upgrade-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('upgrade-project')
		.version('0.0.0')
		.description('Upgrades MavensMate project, if necessary')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};