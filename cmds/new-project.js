/* new_project commander component
 * To use add require('../cmds/new-project.js')(program) to your commander.js based node executable before program.parse
 */
'use strict';

var inquirer 					= require('inquirer');
var _ 								= require('lodash');
var util 							= require('../lib/util').instance;
var merge 						= require('merge');
var Renderer 					= require('../lib/ui/renderer');
var Project 					= require('../lib/project');
var SalesforceClient 	= require('../lib/sfdc-client');

module.exports = function(program) {

	var _getSobjectList = function(describeResult) {
		var sobjects = [];
		_.each(describeResult.sobjects, function(so) {
			sobjects.push(so.name);
		});
		return sobjects;
	};
 
	program
		.command('new-project')
		.alias('new_project')
		.option('--ui', 'Launches the default UI for the selected command.')
		.option('--something', 'does something!')
		.version('0.0.1')
		.description('Creates a new Salesforce1 project')
		.action(function(){
			var self = this;

			if (util.isUICommand(self)) {
				var renderer = new Renderer('new-project');
				renderer.render()
					.then(function(tmpFileLocation){
						return util.respond(self, tmpFileLocation);
					})
					['catch'](function(error) {
						return util.respond(self, 'Could not open new-project UI', false, error);
					});
			} else if (util.isHeadless()) {
				
				var jsonPayload;
				var newProject;

				util.getPayload()
					.then(function(stdInResult) {
						jsonPayload = stdInResult;
						var sfdcClient = new SalesforceClient(jsonPayload);
						return sfdcClient.initialize();
					})
					.then(function() {
						newProject = new Project(jsonPayload);
						return newProject.initialize(true);
					})
					.then(function() {
						return newProject.retrieveAndWriteToDisk();
					})
					.then(function() {
						util.respond(self, 'Project created successfully');
					})
					['catch'](function(error) {
						util.respond(self, 'Could not create project', false, error);
					})
					.done();

			} else if (util.isInteractive()) {	
				var userInput;

				inquirer.prompt([
				  {
			      type: 'input',
			      name: 'projectName',
			      message: 'What would you like to name your project?'
			    },
				  {
				    type: 'list',
				    name: 'orgType',
				    message: 'What kind of org who you like to connect to?',
				    choices: [
				      'Production',
				      'Sandbox',
				      'Prerelease',
				      'Custom'
				    ]
				  },
				  {
			      type: 'input',
			      name: 'username',
			      message: 'Please enter your salesforce.com username'
			    },
			    {
			      type: 'password',
			      name: 'password',
			      message: 'Please enter your salesforce.com password'
			    },
			    {
			      type: 'input',
			      name: 'securityToken',
			      message: 'Please enter your security token (optional)'
			    }
				], function( answers ) {
					// the first few prompts ensure we have the proper context to connect to salesforce,
					// do a describe and offer a list of types to download 
					// console.log( JSON.stringify(answers, null, '  ') );
					userInput = answers;

					var opts = {
						username : answers.username,
						password : answers.password,
						orgType : answers.orgType,
						securityToken : answers.token
					};

					var sfdcClient = new SalesforceClient(opts);

					sfdcClient.initialize()
						.then(function() {
							return sfdcClient.describeGlobal();
						})
						.then(function(describeResult) {
							
							// assemble a list of sobject types to present to user
							var sobjects = _getSobjectList(describeResult);
							var apexVfMetadata = [
								'ApexClass',
								'ApexComponent',
								'ApexPage',
								'ApexTrigger',
								'StaticResource'
							];
							var unpackagedChoices = [
								new inquirer.Separator('Apex/Visualforce')
							];
							_.each(apexVfMetadata, function(m) {
								unpackagedChoices.push({
									name: m,
									checked: true
								});
							});
							unpackagedChoices.push(new inquirer.Separator('Other metadata types:'));
							_.each(sobjects, function(so) {
								if (apexVfMetadata.indexOf(so) === -1) {
									unpackagedChoices.push({
										name: so
									});
								}
							});

							// present list for selection (apex/vf types selected by default)
							inquirer.prompt([
								{
								  type: 'list',
								  name: 'projectType',
								  message: 'Would you like to download a package or select from unpackaged metadata?',
								  choices: [
								    'Unpackaged',
								    'Package'
								  ]
								} 
						  ], function(answers) {
						  	userInput = merge.recursive(answers, userInput);

						  	if (answers.projectType === 'Package') {
						  		// present list of packages
						  		inquirer.prompt([
					  			  {
					  		      type: 'checkbox',
					  		      message: 'Please select the packages you wish to download',
					  		      name: 'packages',
					  		      choices: choices,
					  		      validate: function( answer ) {
					  		        if ( answer.length < 1 ) {
					  		          return 'You must choose at least one package.';
					  		        }
					  		        return true;
					  		      }
					  		    }
					  		  ], function(answers) {
						  			userInput = merge.recursive(answers, userInput);
						  			sfdcClient.retrievePackaged(answers.packages);	
						  			// todo: ensure project creation adds "packages" structure to settings to keep track of packages
						  			var sfdcClient = new SalesforceClient(userInput);
				  		  		sfdcClient.initialize()
						  		  	.then(function() {
						  		  		newProject = new Project(userInput);
						  		  		return newProject.initialize(true);
						  		  	})
						  		  	.then(function() {
						  		  		return newProject.retrieveAndWriteToDisk();
						  		  	})
						  		  	['catch'](function(error) {
						  		  		console.log('error!');
						  		  		console.log(error.stack);
						  		  	})
						  		  	['finally'](function() {
						  		  		// console.log('done!');
						  		  	});
					  		  });	
						  	} else {
					  			// present list for selection (apex/vf types selected by default)
					  			inquirer.prompt([
					  			  {
					  		      type: 'checkbox',
					  		      message: 'Please select the metadata types you wish to download as part of your project',
					  		      name: 'package',
					  		      choices: unpackagedChoices,
					  		      validate: function( answer ) {
					  		        if ( answer.length < 1 ) {
					  		          return 'You must choose at least one metadata type.';
					  		        }
					  		        return true;
					  		      }
					  		    }
					  		  ], function(answers) {
					  		  	userInput = merge.recursive(answers, userInput);
					  		  	// sfdcClient.retrieveUnpackaged(answers.metadata);

				  		  		var sfdcClient = new SalesforceClient(userInput);
				  		  		sfdcClient.initialize()
						  		  	.then(function() {
						  		  		newProject = new Project(userInput);
						  		  		return newProject.initialize(true);
						  		  	})
						  		  	.then(function() {
						  		  		return newProject.retrieveAndWriteToDisk();
						  		  	})
						  		  	['catch'](function(error) {
						  		  		console.log('error!');
						  		  		console.log(error.stack);
						  		  	})
						  		  	['finally'](function() {
						  		  		// console.log('done!');
						  		  	});

					  		  });	
						  	}
						  });	
						})
						['catch'](function(error) {
							return util.respond(self, 'Could not create project', false, error);
						})
						['finally'](function() {
							// TODO: clean up directory if one was created
						});
				});
			}				
		});	
};