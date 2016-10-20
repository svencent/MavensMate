# Node Module

You can build your own Salesforce IDEs by integrating with the APIs exposed in this project.

## Install

`npm install mavensmate --save`

## Usage

```javascript
var mavensmate = require('mavensmate');
var Project = mavensmate.Project;
var SalesforceClient = mavensmate.SalesforceClient;
var CommandExecutor = mavensmate.CommandExecutor;

var cmdExe = new CommandExecutor();
var sfdcClient = new SalesforceClient({
	username: 'foo@bar.com',
	password: 'secret123!'
});
var myProject = new Project({
	path: '/path/to/mavensmate/project',
	sfdcClient: sfdcClient
});

myProject.initialize(true)
	.then(function() {
		return cmdExe.execute({
			name: 'compile-project',
			project: myProject
		});
	})
	.then(function(res) {
		console.log('command result', res);
	})
	.catch(function(err) {
		console.error('womp', err);
	});
```