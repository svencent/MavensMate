'use strict';

var helper 			= require('../test-helper');
var chai 				= require('chai');
var path 				= require('path');
// var assert 			= chai.assert;
var should 			= chai.should();

describe('mavensmate new-project', function(){

	afterEach( function() { 
		helper.cleanUpWorkspace();
	});

	it('should require username and password', function(done) {
		var testClient = helper.createClient('atom');
		testClient.executeCommand('new-project', {}, function(err, response) {
			should.equal(response, undefined);
			err.should.have.property('error');
			err.error.should.equal('Please specify username, password, and project name');
			done();
		});
	});

	it('should prompt that project directory already exists', function(done) {
		var testClient = helper.createClient('atom');
		var payload = {
			projectName: 'existing-project',
			username: 'mm@force.com',
			password: 'force',
			workspace: path.join(helper.baseTestDirectory(),'workspace')
		};
		testClient.executeCommand('new-project', payload, function(err, response) {
			should.equal(response, undefined);
			err.should.have.property('error');
			err.error.should.equal('Could not initiate new Project instance: Error: Directory already exists!');
			done();
		});
	});

	it('should create project in specified workspace', function(done) {
		
		this.timeout(10000);

		var testClient = helper.createClient('atom');
		
		var payload = {
			projectName: 'unittest',
			username: 'mm@force.com',
			password: 'force',
			workspace: path.join(helper.baseTestDirectory(),'workspace')
		};

		testClient.executeCommand('new-project', payload, function(err, response) {
			should.equal(err, null);
			response.should.have.property('result');
			response.result.should.equal('Project created successfully');
			done();
		});
	});

});
