'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();
var path				= require('path');

describe('mavensmate delete-metadata', function(){

	it('should create then delete metadata from server', function(done) {
		
		this.timeout(100000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			
			var payload = {
		    metadataType: 'ApexClass', 
		    params: {'api_name': 'unittestapexclass'}, 
		    githubTemplate: {
		        author: 'MavensMate', 
		        name: 'Default', 
		        description: 'The default template for an Apex Class', 
		        file_name: 'ApexClass.cls', 
		        params: [
	            {
	                default: 'MyApexClass', 
	                name: 'api_name', 
	                description: 'Apex Class API Name'
	            }
		        ]
		    }
			};

			testClient.executeCommand('new-metadata', payload, function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.success.should.equal(true);
				response.result.status.should.equal('Succeeded');
			
				var payload = {
					files: [path.join(testClient.getProject().path, 'src', 'classes', 'unittestapexclass.cls')]
				};

				testClient.executeCommand('delete-metadata', payload, function(err, response) {
					should.equal(err, null);
					response.should.have.property('result');
					response.result.success.should.equal(true);
					response.result.status.should.equal('Succeeded');
					done();
				});

			});
		

		});

	});

});
