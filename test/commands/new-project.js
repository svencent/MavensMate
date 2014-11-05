'use strict';

var mavensmate 	= require('../../lib/mavensmate');
var chai 				= require('chai');
var exec 				= require('child_process').exec;
var path 				= require('path');
// var sinon 		= require('sinon');

// chai.use(chaiAsPromised);
var assert = chai.assert;
var should = chai.should();

// afterEach(function(done) {
// 	if (testClient && _.isFunction(testClient.destroy)) {
// 		testClient.destroy();		
// 	}
// 	done();
// });

describe('mavensmate new-project', function(){
	// var cmd = 'node '+path.join(__dirname, '../bin/mavensmate')+' ';
	var testClient;

	afterEach(function(done) {
		testClient.destroy();
		done();
	});

	it('--ui flag should return new tmp html file', function(done) {
		
		this.timeout(1000000);

		testClient = mavensmate.createClient({
			editor: 'sublime',
			headless: true,
			debugging: true
		});

		testClient.executeCommand('new-project', {
			args: {
				ui: true
			}
		}, function(err, response) {
			should.equal(err, null);
			response.should.have.property('result');
			console.log(response);
			// done();
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

	// it('--version should run without errors', function(done) {
	// 	var cmd = 'node '+path.join(__dirname, '../bin/mavensmate')+' ';
	// 	console.log(cmd);
	// 	exec(cmd+'new-project --help', function (error, stdout, stderr) {
	// 		console.log(error);
	// 		assert(!error);
	// 		done();
	// 	});
	// });

	// it('--headless flag should create a new project', function(done) {
		
	// 	this.timeout(20000);

	// 	var command = new mavensmate.NewProjectCommand({
	// 		args: {
	// 			editor: 'sublime',
	// 			headless: true
	// 		},
	// 		payload: {
	// 			username: 'mm@force.com',
	// 			password: 'force',
	// 			orgType: 'developer',
	// 			package: {
	// 				'ApexClass' : '*'
	// 			}
	// 		}
	// 	});

	// 	command.execute(function(err, response) {
	// 		should.equal(err, null);
	// 		response.should.have.property('result');
	// 		done();
	// 	});
		
	// });

});
