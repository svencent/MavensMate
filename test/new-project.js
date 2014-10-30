'use strict';

var mavensmate 	= require('../lib/mavensmate');
var chai 				= require('chai');
// var exec 		= require('child_process').exec;
// var path 		= require('path');
// var sinon 		= require('sinon');

// chai.use(chaiAsPromised);
// var assert = chai.assert;
var should = chai.should();

describe('mavensmate new-project', function(){
	// var cmd = 'node '+path.join(__dirname, '../bin/mavensmate')+' ';
	
	it('--ui flag should return new tmp html file', function(done) {
		
		this.timeout(2000);

		var command = new mavensmate.NewProjectCommand({
			args: {
				ui : true,
				client : 'sublime'
			}
		});

		command.execute(function(err, response) {
			should.equal(err, null);
			response.should.have.property('result');
			done();
		});

	});

	it('--headless flag should create a new project', function(done) {
		
		this.timeout(20000);

		var command = new mavensmate.NewProjectCommand({
			args: {
				client: 'sublime',
				headless: true
			},
			payload: {
				username: 'mm@force.com',
				password: 'force',
				orgType: 'developer',
				package: {
					'ApexClass' : '*'
				}
			}
		});

		command.execute(function(err, response) {
			should.equal(err, null);
			response.should.have.property('result');
			done();
		});
		
	});

});
