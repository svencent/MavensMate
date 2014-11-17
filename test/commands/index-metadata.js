'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();

describe('mavensmate index-metadata', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'index-metadata');

	it('should index metadata based on the project subscription', function(done) {
		
		this.timeout(80000);

		helper.setProject(testClient, 'index-metadata', function() {
			testClient.executeCommand('index-metadata', function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				response.result.should.equal('Metadata successfully indexed');
        // TODO assertions for contests of .org_metadata
				done();
			});
		});

    helper.cleanUpTestProject('index-metadata');

	});

});
