'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
// var assert 			= chai.assert;
var should 			= chai.should();

describe('mavensmate index-metadata', function(){

	it('should index metadata based on the project subscription', function(done) {
		
		this.timeout(80000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			testClient.executeCommand('index-metadata', function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.should.equal('Metadata successfully indexed');
				done();
			});
		});

	});

});
