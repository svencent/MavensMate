'use strict';

var fs                = require('fs-extra');
var path              = require('path');
var helper            = require('../test-helper');
var Document          = require('../../app/lib/document').Document;
var chai              = require('chai');
var should            = chai.should();
var logger            = require('winston');
var sinon             = require('sinon');

describe('mavensmate document', function(){

  var project;
  var sandbox;
  var commandExecutorStub;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    // commandExecutorStub = sandbox.stub(app.get('commandExecutor'), 'execute');
    // commandExecutorStub.resolves({ success: true });
    helper.stubSalesforceClient(sandbox);
    helper.bootstrapEnvironment();
    helper.putTestProjectInTestWorkspace('path-test');
    helper.addProject('path-test')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  afterEach(function(done) {
    sandbox.restore();
    helper.cleanUpProject('path-test');
    done();
  });

  it('should be an ApexClass', function(done) {
    var apexClassPath = path.join(helper.baseTestDirectory(), 'workspace', 'path-test', 'src', 'classes', 'foo.cls');
    fs.outputFileSync(apexClassPath, '');
    var myPath = new Document({
      project: project,
      path: apexClassPath
    });
    logger.debug(myPath.print());
    done();
  });


});
