'use strict';

var helper          = require('../test-helper');
var chai            = require('chai');
var should          = chai.should();
var fs              = require('fs-extra');
var path            = require('path');
var PackageService  = require('../../lib/mavensmate/package');
var Metadata        = require('../../lib/mavensmate/metadata').Metadata;

describe('mavensmate unit-package', function(){

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'package-test');

  // helper.goOffline();

  // it('should parse package.xml', function(done) {
    
  //   this.timeout(10000);

  //   var members = '<types><members>*</members><name>ApexClass</name></types><types><members>*</members><name>ApexPage</name></types>';
  //   var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>30.0</version></Package>';
  //   fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'package.xml'), packageXml);

  //   helper.setProject(testClient, 'package-test', function() {
  //     testClient.getProject()._parsePackageXml()
  //       .then(function(pkg) {
  //         pkg.should.have.property('ApexClass');
  //         pkg.should.have.property('ApexPage');
  //         pkg.ApexClass.should.equal('*');
  //         pkg.ApexPage.should.equal('*');
  //         done();
  //       });
  //   });

  //   helper.cleanUpTestProject('package-test');

  // });

  it('should deserialize package.xml', function(done) {
    
    this.timeout(3000);

    // write phony package
    var members = '<types><members>*</members><name>ApexClass</name></types><types><members>*</members><name>ApexPage</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>30.0</version></Package>';
    var packageLocation = path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'package.xml');
    fs.writeFileSync(packageLocation, packageXml);

    // deserialize package
    var packageService = new PackageService({ location: packageLocation });
    helper.setProject(testClient, 'package-test', function() {
      packageService.deserialize()
        .then(function(pkg) {
          pkg.should.have.property('ApexClass');
          pkg.should.have.property('ApexPage');
          pkg.ApexClass.should.equal('*');
          pkg.ApexPage.should.equal('*');
          done();
        })
        ['catch'](function(e) {
          done(e);
        })
        .done();
    });

  });

  it('should add metadata to package.xml', function(done) {
    
    this.timeout(4000);

    helper.setProject(testClient, 'package-test', function() {

      // write phony package
      var members = '<types><members>foo</members><name>ApexClass</name></types><types><members>*</members><name>ApexPage</name></types>';
      var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>30.0</version></Package>';
      var packageLocation = path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'package.xml');
      fs.writeFileSync(packageLocation, packageXml);

      // write phony apex class
      var newApexClassLocation = path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'classes', 'unit-test-class.cls');
      fs.createFileSync(newApexClassLocation);
      fs.writeFileSync(newApexClassLocation, '');

      // add to package service, deserialize
      var newMetadata = new Metadata({
        project: testClient.getProject(),
        path: newApexClassLocation
      });
      var packageService = new PackageService({ location: packageLocation });
      packageService.insert(newMetadata)
        .then(function(pkg) {
          pkg.should.have.property('ApexClass');
          pkg.should.have.property('ApexPage');
          pkg.ApexClass[0].should.equal('foo');
          pkg.ApexClass[1].should.equal('unit-test-class');
          done();
        })
        ['catch'](function(e) {
          console.log('error!');
          done(e);
        })
        .done();
    });

  });

  it('should remove metadata from package.xml', function(done) {
    
    this.timeout(3000);

    helper.setProject(testClient, 'package-test', function() {

      // write phony package
      var members = '<types><members>foo</members><members>bar</members><name>ApexClass</name></types><types><members>*</members><name>ApexPage</name></types>';
      var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>30.0</version></Package>';
      var packageLocation = path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'package.xml');
      fs.writeFileSync(packageLocation, packageXml);

      // write phony apex class
      var newApexClassLocation = path.join(helper.baseTestDirectory(), 'workspace', 'package-test', 'src', 'classes', 'bar.cls');
      fs.createFileSync(newApexClassLocation);
      fs.writeFileSync(newApexClassLocation, '');

      // add to package service, deserialize
      var myMetadata = new Metadata({
        project: testClient.getProject(),
        path: newApexClassLocation
      });

      // remove from package, deserialize
      var packageService = new PackageService({ location: packageLocation });
      packageService.remove(myMetadata)
        .then(function(pkg) {
          pkg.should.have.property('ApexClass');
          pkg.should.have.property('ApexPage');
          pkg.ApexClass.length.should.equal(1);
          pkg.ApexClass[0].should.equal('foo');

          return packageService.serialize(pkg, true);
        })
        .then(function(serializedPackage) {
          console.log(serializedPackage);
          done();
        })
        ['catch'](function(e) {
          done(e);
        })
        .done();
    });

    helper.cleanUpTestProject('package-test');

  });

});
