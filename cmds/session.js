/* session commander component
 * To use add require('../cmds/session.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

module.exports = function(program) {

	program
		.command('session [username] [password]')
		.version('0.0.0')
		// .option('-u <username>', 'salesforce.com username')
		// .option('-p <password>', 'salesforce.com password')
		// .option('-o <org_type>', 'Type of org: prod, dev, sandbox, custom')
		.description('Creates new salesforce.com session, returns session id')
		.action(function(username, password) {
			var opts = {
				username : username,
				password: password,
				orgType: 'developer'
			};
			require('../lib/sfdc-client')(program, opts);
		});
	
};