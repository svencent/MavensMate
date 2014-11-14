'use strict';

var _ 					= require('lodash');
var helper 			= require('../test-helper');
var chai 				= require('chai');
var should 			= chai.should();

describe('mavensmate package', function(){

	it('should parse package.xml', function(done) {
		
		this.timeout(10000);

		var testClient = helper.createClient('atom');

		helper.setProject(testClient, 'existing-project', function() {
			testClient.getProject()._parsePackageXml()
				.then(function(pkg) {
					pkg.should.have.property('ApexClass');
					pkg.should.have.property('ApexPage');
					pkg.ApexClass.should.equal('*');
					done();
				});
		});

	});

});
