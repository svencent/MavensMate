'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate open-metadata', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(4000);
    testClient = helper.createClient('atom');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'open-metadata');
    helper.addProject(testClient, 'open-metadata')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    this.timeout(15000);
    var filesToDelete = [
      path.join(helper.baseTestDirectory(),'workspace', 'open-metadata', 'src', 'pages', 'OpenMetadataPage.page')
    ];
    helper.cleanUpTestData(testClient, filesToDelete)
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      })
      .finally(function() {
        helper.cleanUpTestProject('open-metadata');
      });
  });

  it('should return the Visualforce page preview url', function(done) {
    this.timeout(20000);      

    helper.createNewMetadata(testClient, 'ApexPage', 'OpenMetadataPage', 'ApexPage.page', { api_name : 'OpenMetadataPage' } )
      .then(function() {          
        var payload = {
          paths : [ path.join(helper.baseTestDirectory(),'workspace', 'open-metadata', 'src', 'pages', 'OpenMetadataPage.page') ],
          preview: true
        };
        return testClient.executeCommand('open-metadata', payload);
      })
      .then(function(response) {
        
        response.result.should.have.property('OpenMetadataPage.page');
        response.result['OpenMetadataPage.page'].indexOf('secur/frontdoor.jsp?sid=').should.be.at.least(0);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});