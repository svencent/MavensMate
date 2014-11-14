'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();

describe('mavensmate compile-metadata', function(){

	it('should compile a list of files', function(done) {
		
		this.timeout(20000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			
			var payload = {
				files : helper.getProjectFiles(testClient.getProject(), 'ApexClass')
			};

			testClient.executeCommand('compile-metadata', payload, function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result[0].State.should.equal('Completed');
				done();
			});
		});

	});

});
