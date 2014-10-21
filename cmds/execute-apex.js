/* execute-apex commander component
 * To use add require('../cmds/execute-apex.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('execute-apex')
		.version('0.0.0')
		.description('Execute Apex code anonymously')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};