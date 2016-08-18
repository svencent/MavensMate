'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate open-metadata', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('open-metadata');
    helper.addProject('open-metadata')
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
      path.join(helper.baseTestDirectory(),'workspace', 'open-metadata', 'src', 'pages', 'OpenMetadataPage.page')
    ];
    helper.cleanUpTestData(project, filesToDelete)
      .then(function() {
        helper.cleanUpProject('open-metadata');
        done();
      })
      .catch(function(err) {
        helper.cleanUpProject('open-metadata');
        done(err);
      });
  });

  it('should return the Visualforce page preview url', function(done) {
    this.timeout(120000);

    helper.createNewMetadata(project, 'ApexPage', 'OpenMetadataPage', 'ApexPage.page', { api_name : 'OpenMetadataPage' } )
      .then(function() {
        var payload = {
          paths : [ path.join(helper.baseTestDirectory(), 'workspace', 'open-metadata', 'src', 'pages', 'OpenMetadataPage.page') ],
          preview: true
        };
        return commandExecutor.execute({
          name: 'open-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        response.should.have.property('OpenMetadataPage.page');
        response['OpenMetadataPage.page'].indexOf('secur/frontdoor.jsp?sid=').should.be.at.least(0);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});