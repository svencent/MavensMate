'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();

describe('mavensmate refresh-metadata', function(){

	it('should refresh a list of files from the server', function(done) {
		
		this.timeout(20000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			
			var payload = {
				files : helper.getProjectFiles(testClient.getProject(), 'ApexClass')
			};

			testClient.executeCommand('refresh-metadata', payload, function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.should.equal('Metadata successfully refreshed');
				done();
			});
		});

	});

});
