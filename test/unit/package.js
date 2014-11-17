'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();
var fs          = require('fs-extra');
var path        = require('path');

describe('mavensmate unit-package', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'package-test');

  it('should parse package.xml', function(done) {
    
    this.timeout(10000);

    var members = '<types><members>*</members><name>ApexClass</name></types><types><members>*</members><name>ApexPage</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>30.0</version></Package>';
    fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'package.xml'), packageXml);

    helper.setProject(testClient, 'package-test', function() {
      testClient.getProject()._parsePackageXml()
        .then(function(pkg) {
          pkg.should.have.property('ApexClass');
          pkg.should.have.property('ApexPage');
          pkg.ApexClass.should.equal('*');
          pkg.ApexPage.should.equal('*');
          done();
        });
    });

    helper.cleanUpTestProject('package-test');

  });

});
