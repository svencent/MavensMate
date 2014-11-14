'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
// var assert 			= chai.assert;
var should 			= chai.should();

describe('mavensmate compile-project', function(){

	it('should compile the project based on package.xml', function(done) {
		
		this.timeout(40000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			testClient.executeCommand('compile-project', function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.success.should.equal(true);
				response.result.status.should.equal('Succeeded');
				done();
			});
		});

	});

});
