'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var path        = require('path');
var assert      = chai.assert;

chai.use(require('chai-fs'));

describe('mavensmate new-metadata', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('new-metadata');
    helper.addProject('new-metadata')
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
      path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls'),
      path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'triggers', 'NewMetadataTrigger.trigger'),
    ];
    helper.cleanUpTestData(project, filesToDelete)
      .then(function(err) {
        helper.cleanUpProject('new-metadata');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('new-metadata');
        done(err);
      });
  });


  it('should create new Apex Class on the server', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'NewMetadataClass')
      .then(function(response) {
        response.message.should.equal('Success');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls'),  'Class file not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'classes', 'NewMetadataClass.cls-meta.xml'),  'Class meta file not created');
        project.packageXml.subscription.should.have.property('ApexClass');
        project.packageXml.subscription.ApexClass.length.should.equal(1);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should create new Apex Trigger on the server', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexTrigger', 'NewMetadataTrigger', 'ApexTrigger.trigger', { api_name : 'NewMetadataTrigger', object_name : 'Account' } )
      .then(function(response) {
        response.message.should.equal('Success');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'triggers', 'NewMetadataTrigger.trigger'),  'Trigger file not created');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'new-metadata', 'src', 'triggers', 'NewMetadataTrigger.trigger-meta.xml'),  'Trigger meta file not created');
        project.packageXml.subscription.should.have.property('ApexTrigger');
        project.packageXml.subscription.ApexTrigger.length.should.equal(1);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});

