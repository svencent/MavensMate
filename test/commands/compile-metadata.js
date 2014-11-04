'use strict';

var mavensmate 	= require('../../lib/mavensmate');
var chai 				= require('chai');
var exec 				= require('child_process').exec;
var path 				= require('path');
// var sinon 		= require('sinon');

// chai.use(chaiAsPromised);
var assert = chai.assert;
var should = chai.should();

var testClient;

describe('mavensmate compile-metadata', function(){
	// var cmd = 'node '+path.join(__dirname, '../bin/mavensmate')+' ';
	
	it('should compile a list of files', function(done) {
		
		this.timeout(20000);

		testClient = mavensmate.createClient({
			editor: 'sublime',
			headless: true,
			debugging: false
		});

		testClient.setProject('/Users/josephferraro/Development/summer14/force', function(err, response) {
			testClient.executeCommand('compile-metadata', {
				files : [ '/Users/josephferraro/Development/summer14/force/src/classes/AUTOTEST.cls' ]
			}, function(err, response) {
				should.equal(err, null);
				response.should.have.property('result');
				done();
			});
		});
		
		// mavensmate.execute('new-project', {
		// 	args: {
		// 		ui : true,
		// 		client : 'sublime'
		// 	}
		// }, function(err, response) {
		// 	should.equal(err, null);
		// 	response.should.have.property('result');
		// 	done();
		// });

	});

});
