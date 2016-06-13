'use strict';

var helper          = require('../../test-helper');
var chai            = require('chai');
var should          = chai.should();
var path            = require('path');
var fs              = require('fs-extra');
var assert          = chai.assert;
var mavensMateFile  = require('../../../lib/mavensmate/file');

chai.use(require('chai-fs'));

describe('mavensmate refresh-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(120000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'refresh-metadata');
    helper.addProject(testClient, 'refresh-metadata')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(120000);
    helper.cleanUpTestProject('refresh-metadata');
    done();
  });

  it('should refresh class directory from the server', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(testClient, 'ApexClass', 'RefreshMetadataClass')
      .then(function() {
        assert.isFile(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass.cls'));
        fs.removeSync(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass.cls'));

        var payload = {
          paths: [ path.join(testClient.getProject().path, 'src', 'classes') ]
        };

        return testClient.executeCommand({
          name: 'refresh-metadata',
          body: payload
        });
      })
      .then(function(response) {

        response.message.should.equal('Metadata successfully refreshed');
        fs.existsSync(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass.cls')).should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should refresh class file from the server', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(testClient, 'ApexClass', 'RefreshMetadataClass2')
      .then(function() {
        assert.isFile(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls'));
        fs.removeSync(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls'));
        var payload = {
          paths: [ path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls') ]
        };
        return testClient.executeCommand({
          name: 'refresh-metadata',
          body: payload
        });
      })
      .then(function(response) {

        response.message.should.equal('Metadata successfully refreshed');
        path.join(testClient.getProject().path, 'src', 'classes', 'RefreshMetadataClass2.cls').should.be.a.file('RefreshMetadataClass2 is missing');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should refresh a CustomObject from the server ', function(done) {
    this.timeout(120000);

    var accountMetadataFile = new mavensMateFile.MavensMateFile({ project: testClient.getProject() });
    accountMetadataFile.setTypeByXmlName('CustomObject');
    accountMetadataFile.setAbstractPath();
    testClient.getProject().packageXml.subscribe(accountMetadataFile);
    testClient.getProject().packageXml.writeFileSync();

    var payload = {
      paths: [ path.join(testClient.getProject().path, 'src', 'objects', 'Account.object') ]
    };

    testClient.executeCommand({
        name: 'refresh-metadata',
        body: payload
      })
      .then(function(response) {

        response.message.should.equal('Metadata successfully refreshed');
        fs.existsSync(path.join(testClient.getProject().path, 'src', 'objects', 'Account.object')).should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should refresh project ', function(done) {
    this.timeout(120000);

    testClient.getProject().packageXml.subscription = {
      ApexClass: '*',
      CustomObject: '*'
    };
    helper.createNewMetadata(testClient, 'ApexClass', 'RefreshProject')
      .then(function() {
        assert.isFile(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshProject.cls'));
        fs.removeSync(path.join(testClient.getProject().path, 'src', 'classes', 'RefreshProject.cls'));
        return;
      })
      .then(function() {
        return testClient.getProject().packageXml.init();
      })
      .then(function() {
        testClient.getProject().packageXml.writeFileSync();
        return testClient.executeCommand({
          name: 'index-metadata'
        });
      })
      .then(function(response) {
        var payload = {
          paths: [ path.join(testClient.getProject().path, 'src') ]
        };
        return testClient.executeCommand({
          name: 'refresh-metadata',
          body: payload
        });
      })
      .then(function(response) {
        response.message.should.equal('Metadata successfully refreshed');
        fs.existsSync(path.join(testClient.getProject().path, 'src', 'objects', 'Account.object')).should.equal(true);
        fs.existsSync(path.join(testClient.getProject().path, 'src', 'classes')).should.equal(true);
        path.join(testClient.getProject().path, 'src', 'classes', 'RefreshProject.cls').should.be.a.file('RefreshProject is missing');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});

