'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');
var fs          = require('fs');

chai.use(require('chai-fs'));

describe('mavensmate delete-metadata', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.bootstrapEnvironment();
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('delete-metadata');
    helper.addProject('delete-metadata')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('delete-metadata');
    done();
  });

  it('should create then delete metadata from server', function(done) {

    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexClass', 'DeleteMetadataClass')
      .then(function() {
        return helper.createNewMetadata(project, 'ApexClass', 'DeleteMetadataClass2');
      })
      .then(function() {
        var payload = {
          paths: [
            path.join(project.path, 'src', 'classes', 'DeleteMetadataClass.cls') ,
            path.join(project.path, 'src', 'classes', 'DeleteMetadataClass2.cls')
          ]
        };

        return commandExecutor.execute({
          name: 'delete-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {

        response.success.should.equal(true);
        response.status.should.equal('Succeeded');
        response.numberComponentErrors.should.equal(0);
        response.numberComponentsDeployed.should.equal(2);
        fs.existsSync(path.join(project.path, 'src', 'classes', 'DeleteMetadataClass.cls')).should.equal(false);
        fs.existsSync(path.join(project.path, 'src', 'classes', 'DeleteMetadataClass2.cls')).should.equal(false);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

});
