'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var logger      = require('winston');

describe('mavensmate compile-metadata', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    helper.boostrapEnvironment();
    this.timeout(120000);
    /*jshint camelcase: false */
    process.env.mm_compile_check_conflicts = false;
    /*jshint camelcase: true */
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('compile-metadata');
    helper.addProject('compile-metadata')
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
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingFailClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'ConflictCheckClass.cls')
    ];
    commandExecutor.execute({
      name: 'edit-project',
      body: { package: { ApexClass: '*' } },
      project: project
    })
    .then(function(response) {
      should.not.equal(response, null);
      return helper.cleanUpTestData(project, filesToDelete);
    })
    .then(function() {
      process.env.mm_compile_check_conflicts = false;
      helper.cleanUpProject('compile-metadata');
      done();
    })
    .catch(function(err) {
      process.env.mm_compile_check_conflicts = false;
      helper.cleanUpProject('compile-metadata');
      done(err);
    });
  });

  it('should compile an apex class successfully via the tooling api', function(done) {
    this.timeout(120000);
    helper.createNewMetadata(project, 'ApexClass', 'CompileMetadataToolingClass')
      .then(function() {
        var apexClassPath = path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingClass.cls');
        var payload = {
          paths : [ apexClassPath ]
        };
        process.env.mm_compile_with_tooling_api = true;
        return commandExecutor.execute({
          name: 'compile-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        response.success.should.equal(true);
        response.details.componentSuccesses.length.should.equal(1);
        response.details.componentSuccesses[0].State.should.equal('Completed');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should check for conflicts on the server', function(done) {
    /*jshint camelcase: false */
    this.timeout(120000);
    process.env.mm_compile_check_conflicts = true;
    helper.createNewMetadata(project, 'ApexClass', 'ConflictCheckClass')
      .then(function() {
        return project.updateLocalStore({
            'createdById': '005o0000000TB1iAAG',
            'createdByName': 'Joseph Ferraro',
            'createdDate': '2014-08-18T16:09:51.000Z',
            'fileName': 'unpackaged/classes/ConflictCheckClass.cls',
            'fullName': 'ConflictCheckClass',
            'id': '01po0000001iVdXAAU',
            'lastModifiedById': '005o0000000TB1iAAG',
            'lastModifiedByName': 'Joseph Ferraro',
            'lastModifiedDate': '2012-08-18T16:09:51.000Z',
            'manageableState': 'unmanaged',
            'namespacePrefix': 'mm2',
            'type': 'ApexClass',
            'mmState': 'clean'
          })
      })
      .then(function() {
        var payload = {
          paths : [ path.join(project.path, 'src', 'classes', 'ConflictCheckClass.cls') ]
        };
        return commandExecutor.execute({
          name: 'compile-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {

        response.success.should.equal(false);
        response.details.componentSuccesses.length.should.equal(0);
        response.details.conflicts.should.have.property('ConflictCheckClass.cls');
        process.env.mm_compile_check_conflicts = false;
        done();
      })
      .catch(function(err) {
        done(err);
      });
      /*jshint camelcase: true */
  });

  it('should unsuccessfully attempt to compile an apex class via the tooling api', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'CompileMetadataToolingFailClass')
      .then(function() {
        var apexClassPath = path.join(helper.baseTestDirectory(),'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataToolingFailClass.cls');
        var payload = {
          paths : [ apexClassPath ]
        };
        fs.outputFileSync(apexClassPath, 'public class CompileMetadataToolingFailClass { this will not work }');
        return commandExecutor.execute({
          name: 'compile-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {

        response.success.should.equal(false);
        response.details.componentFailures.length.should.equal(1);
        response.details.componentFailures[0].should.have.property('DeployDetails');
        response.details.componentFailures[0].DeployDetails.componentFailures[0].success.should.equal(false);
        response.details.componentFailures[0].DeployDetails.componentFailures[0].lineNumber.should.equal(1);
        // response.details.componentFailures[0].DeployDetails.componentFailures[0].columnNumber.should.equal(-1); this is returning 57 in some orgs?
        response.details.componentFailures[0].DeployDetails.componentFailures[0].problemType.should.equal('Error');
        response.details.componentFailures[0].DeployDetails.componentFailures[0].fileName.should.contain('CompileMetadataToolingFailClass');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should compile a meta.xml file via the metadata api', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'CompileMetadataClass')
      .then(function() {
        var metaFileLocation = path.join(helper.baseTestDirectory(), 'workspace', 'compile-metadata', 'src', 'classes', 'CompileMetadataClass.cls-meta.xml');
        var payload = {
          paths : [metaFileLocation]
        };
        return commandExecutor.execute({
          name: 'compile-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        logger.debug('response from compile', response);
        response.success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should compile an object file via the metadata api', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'edit-project',
        body: { package: { CustomObject: 'Account' } },
        project: project
      })
      .then(function(response) {
        should.not.equal(response, null);

        var accountPath = path.join(project.path, 'src', 'objects', 'Account.object');
        fs.existsSync(accountPath).should.equal(true);
        var payload = {
          paths : [accountPath]
        };
        return commandExecutor.execute({
          name: 'compile-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        response.success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
