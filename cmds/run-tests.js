/* run_tests commander component
 * To use add require('../cmds/run-tests.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('run-tests')
		.version('0.0.0')
		.option('-a, --all', 'Runs all tests')
		.description('Runs Apex unit tests')
		.action(function(/* Args here */){
			// Your code goes here
		});
	
};