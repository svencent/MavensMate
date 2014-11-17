'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();

describe('mavensmate compile-project', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'compile-project');

	it('should compile the project based on package.xml', function(done) {
    
    this.timeout(40000);
    
		helper.setProject(testClient, 'compile-project', function() {
			testClient.executeCommand('edit-project', { package: { 'ApexComponent' : '*' } }, function() {
        testClient.executeCommand('compile-project', function(err, response) {
          should.equal(err, null);
          response.should.have.property('result');
          response.result.success.should.equal(true);
          response.result.status.should.equal('Succeeded');
          done();
        });
      }); 
		});

    helper.cleanUpTestProject('compile-project');
	});

});
