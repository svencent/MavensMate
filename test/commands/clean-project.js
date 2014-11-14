'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
// var assert 			= chai.assert;
var should 			= chai.should();

describe('mavensmate clean-project', function(){

	it('should revert the project to server state based on package.xml', function(done) {
		
		this.timeout(20000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			testClient.executeCommand('clean-project', function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.should.equal('Project cleaned successfully');
				done();
			});
		});

	});

});
