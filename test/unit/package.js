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

describe('mavensmate package', function(){
	// var cmd = 'node '+path.join(__dirname, '../bin/mavensmate')+' ';
	
	it('should parse package.xml', function(done) {
		
		this.timeout(10000);

		testClient = mavensmate.createClient({
			editor: 'sublime',
			headless: true,
			debugging: true
		});

		testClient.setProject('/Users/josephferraro/Development/summer14/force', function(err, response) {
			testClient.getProject()._parsePackageXml()
				.then(function(m) {
					console.log(m);
					done();
				})
				['catch'](function(err) {
					console.log(err);
					done();
				})
				.done();
		});
	
	});

});
