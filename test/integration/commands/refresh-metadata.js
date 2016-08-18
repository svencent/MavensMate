'use strict';

var helper          = require('../../test-helper');
var chai            = require('chai');
var should          = chai.should();
var path            = require('path');
var fs              = require('fs-extra');
var assert          = chai.assert;
var mavensMateFile  = require('../../../app/lib/file');

chai.use(require('chai-fs'));

describe('mavensmate refresh-metadata', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('refresh-metadata');
    helper.addProject('refresh-metadata')
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
    helper.cleanUpProject('refresh-metadata');
    done();
  });

  it('should refresh class directory from the server', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'RefreshMetadataClass')
      .then(function() {
        assert.isFile(path.join(project.path, 'src', 'classes', 'RefreshMetadataClass.cls'));
        fs.removeSync(path.join(project.path, 'src', 'classes', 'RefreshMetadataClass.cls'));

        var payload = {
          paths: [ path.join(project.path, 'src', 'classes') ]
        };

        return commandExecutor.execute({
          name: 'refresh-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {

        response.message.should.equal('Metadata successfully refreshed');
        fs.existsSync(path.join(project.path, 'src', 'classes', 'RefreshMetadataClass.cls')).should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should refresh class file from the server', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'RefreshMetadataClass2')
      .then(function() {
        assert.isFile(path.join(project.path, 'src', 'classes', 'RefreshMetadataClass2.cls'));
        fs.removeSync(path.join(project.path, 'src', 'classes', 'RefreshMetadataClass2.cls'));
        var payload = {
          paths: [ path.join(project.path, 'src', 'classes', 'RefreshMetadataClass2.cls') ]
        };
        return commandExecutor.execute({
          name: 'refresh-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {

        response.message.should.equal('Metadata successfully refreshed');
        path.join(project.path, 'src', 'classes', 'RefreshMetadataClass2.cls').should.be.a.file('RefreshMetadataClass2 is missing');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should refresh a CustomObject from the server ', function(done) {
    this.timeout(120000);

    var accountMetadataFile = new mavensMateFile.MavensMateFile({ project: project });
    accountMetadataFile.setTypeByXmlName('CustomObject');
    accountMetadataFile.setAbstractPath();
    project.packageXml.subscribe(accountMetadataFile);
    project.packageXml.writeFileSync();

    var payload = {
      paths: [ path.join(project.path, 'src', 'objects', 'Account.object') ]
    };

    commandExecutor.execute({
        name: 'refresh-metadata',
        body: payload,
        project: project
      })
      .then(function(response) {

        response.message.should.equal('Metadata successfully refreshed');
        fs.existsSync(path.join(project.path, 'src', 'objects', 'Account.object')).should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should refresh project ', function(done) {
    this.timeout(120000);

    project.packageXml.subscription = {
      ApexClass: '*',
      CustomObject: '*'
    };
    helper.createNewMetadata(project, 'ApexClass', 'RefreshProject')
      .then(function() {
        assert.isFile(path.join(project.path, 'src', 'classes', 'RefreshProject.cls'));
        fs.removeSync(path.join(project.path, 'src', 'classes', 'RefreshProject.cls'));
        return;
      })
      .then(function() {
        return project.packageXml.init();
      })
      .then(function() {
        project.packageXml.writeFileSync();
        return commandExecutor.execute({
          name: 'index-metadata',
          project: project
        });
      })
      .then(function(response) {
        var payload = {
          paths: [ path.join(project.path, 'src') ]
        };
        return commandExecutor.execute({
          name: 'refresh-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        response.message.should.equal('Metadata successfully refreshed');
        fs.existsSync(path.join(project.path, 'src', 'objects', 'Account.object')).should.equal(true);
        fs.existsSync(path.join(project.path, 'src', 'classes')).should.equal(true);
        path.join(project.path, 'src', 'classes', 'RefreshProject.cls').should.be.a.file('RefreshProject is missing');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});

