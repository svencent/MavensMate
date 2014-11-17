'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();
var path				= require('path');

describe('mavensmate delete-metadata', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'delete-metadata');

	it('should create then delete metadata from server', function(done) {
		
    helper.unlinkEditor();
		this.timeout(100000);

		helper.setProject(testClient, 'delete-metadata', function() {
		
      helper.createNewMetadata(testClient, 'ApexClass', 'DeleteMetadataClass')
        .then(function() {
          var payload = {
            files: [ path.join(testClient.getProject().path, 'src', 'classes', 'DeleteMetadataClass.cls') ]
          };

          testClient.executeCommand('delete-metadata', payload, function(err, response) {
            should.equal(err, null);
            response.should.have.property('result');
            response.result.success.should.equal(true);
            response.result.status.should.equal('Succeeded');
            done();
          });
        })
        .done();

		});
    
    helper.cleanUpTestProject('delete-metadata');
	});

});
