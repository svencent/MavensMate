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

	it.only('should index', function(done) {

		this.timeout(100000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			var indexService = new IndexService({project:testClient.getProject()});
			indexService.indexServerProperties(['SynonymDictionary'])
				.then(function(res) {
					console.log(res);
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

