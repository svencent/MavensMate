/* session commander component
 * To use add require('../cmds/session.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var SalesforceClient = require('../lib/sfdc-client');

var Command = function(){};

Command.execute = function(command, username, password, orgType) {
	// var self = command;

	var opts = {
		username : username,
		password: password,
		orgType: orgType || 'developer'
	};
	var sfdcClient = new SalesforceClient(opts);
	sfdcClient.initialize()
		.then(function(loginResult) {
			console.log(loginResult);
			console.log(global.sfdcClient);
		});
};

exports.command = Command;
exports.addSubCommand = function(program) {
	program
		.command('session [username] [password] [org_type]')
		.version('0.0.1')
		.option('-u <username>', 'salesforce.com username')
		.option('-p <password>', 'salesforce.com password')
		.option('-o <org_type>', 'Type of org: prod, dev, sandbox, custom')
		.description('Creates new salesforce.com session, returns session id')
		.action(function(username, password, orgType) {
			Command.execute(this, username, password, orgType);	
		});
};