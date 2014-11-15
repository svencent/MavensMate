'use strict';

var _ 						= require('lodash');
var helper 				= require('../test-helper');
var chai 					= require('chai');
var should 				= chai.should();
var IndexService 	= require('../../lib/mavensmate/index');

describe('mavensmate org-index', function(){

	it('should select metadata based on package.xml', function(done) {
		
		this.timeout(10000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			testClient.getProject().getOrgMetadata()
				.then(function(m) {
					var apexClass = _.find(m, {id:'ApexClass'});
					apexClass.select.should.equal(true);
					done();
				});
		});

	});

	it('should index different types of metadata', function(done) {

		this.timeout(100000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			var indexService = new IndexService({project:testClient.getProject()});
			indexService.indexServerProperties(['ApexClass', 'CustomObject', 'Report'])
				.then(function(res) {
					var apexClassResult = res[0];
					var customObjectResult = res[1];
					var reportResult = res[2];

					apexClassResult.title.should.equal('ApexClass');
					apexClassResult.isFolder.should.equal(true);
					apexClassResult.cls.should.equal('folder');
					apexClassResult.children.length.should.be.at.least(1);

					customObjectResult.title.should.equal('CustomObject');
					customObjectResult.isFolder.should.equal(true);
					customObjectResult.inFolder.should.equal(false);
					customObjectResult.hasChildTypes.should.equal(true);
					customObjectResult.cls.should.equal('folder');
					customObjectResult.children.length.should.be.at.least(1);

					reportResult.title.should.equal('CustomObject');
					reportResult.isFolder.should.equal(true);
					reportResult.inFolder.should.equal(true);
					reportResult.hasChildTypes.should.equal(false);
					reportResult.cls.should.equal('folder');
					reportResult.children.length.should.be.at.least(1);
				})
				['catch'](function(err) {
					console.log(err);
				})
				['finally'](function() {
					done();
				})
				.done();
		});
	});

});

