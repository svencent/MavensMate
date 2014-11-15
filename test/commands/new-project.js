'use strict';

var helper 				= require('../test-helper');
var chai 					= require('chai');
var path 					= require('path');
var assert 				= chai.assert;
var should 				= chai.should();
var util 					= require('../../lib/mavensmate/util').instance;
var sinon 				= require('sinon');
var EditorService = require('../../lib/mavensmate/editor');

chai.use(require('chai-fs'));

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

	it('should prompt because of bad salesforce creds', function(done) {
		this.timeout(10000);

		var testClient = helper.createClient('atom');
		var payload = {
			projectName: 'existing-project',
			username: 'thiswontwork@force.com',
			password: 'thisisabadpassword',
			workspace: path.join(helper.baseTestDirectory(),'workspace')
		};
		testClient.executeCommand('new-project', payload, function(err, response) {
			should.equal(response, undefined);
			err.should.have.property('error');
			err.error.should.contain('INVALID_LOGIN: Invalid username, password, security token; or user locked out');
			done();
		});
	});

	it('should create project in specified workspace', function(done) {
		
		sinon.stub(EditorService.prototype, 'open').returns(null);

		this.timeout(50000);

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
			assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'unittest'),  'Project directory does not exist');
			assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'unittest', 'config'),  'Project config directory does not exist');
			assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'unittest', 'src'),  'Project src directory does not exist');
			assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'unittest', 'src', 'package.xml'),  'Project package.xml does not exist');
			helper.setProject(testClient, 'unittest', function() {
				var project = testClient.getProject();
				project.settings.username.should.equal('mm@force.com');
				project.settings.password.should.equal('force');
				project.settings.environment.should.equal('developer');
				done();
			});
		});
	});

});
