/* edit_project commander component
 * To use add require('../cmds/edit-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';
var util = require('../lib/util').instance;

module.exports = function(program) {

	program
		.command('edit-project')
		.alias('edit_project')
		.version('0.0.1')
		.description('Edits an existing project')
		.action(function(/* Args here */){
			if (!util.isValidProject()) {
				console.log('this command requires a valid MavensMate project');
			}	
		});
	
};