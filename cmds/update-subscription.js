/* update-subscription commander component
 * To use add require('../cmds/update-subscription.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('update-subscription')
		.version('0.0.0')
		.description('Updates project metadata subscription')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};