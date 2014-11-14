'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();

describe('mavensmate run-tests', function(){

	it('should compile a list of files', function(done) {
		
		this.timeout(20000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			
			var payload = {
				classes : [ 'MyTestClass.cls' ]
			};

			testClient.executeCommand('run-tests', payload, function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.should.have.property('testResults');
				response.result.should.have.property('coverageResults');
				response.result.testResults.should.have.property('MyTestClass');
				response.result.coverageResults.should.have.property('classes');
				response.result.coverageResults.should.have.property('triggers');
				done();
			});
		});

	});

});

