'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
// var assert 			= chai.assert;
var should 			= chai.should();

describe('mavensmate start-logging', function(){

	it('should start logging for all user ids listed in config/.debug', function(done) {
		
		this.timeout(40000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			testClient.executeCommand('start-logging', function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.should.equal('Started logging for debug users');
				done();
			});
		});

	});

});
