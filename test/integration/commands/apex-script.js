'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var assert      = chai.assert;
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');
var logger      = require('winston');

chai.use(require('chai-fs'));

describe('mavensmate apex-script', function() {

  var project;
  var testClient;
 
  before(function(done) {
    this.timeout(18000);
    helper.unlinkEditor();
    logger.info('editor unlinked');
    testClient = helper.createClient('atom');
    logger.info('test client ready');
    helper.putTestProjectInTestWorkspace(testClient, 'apex-script');
    logger.info('project in workspace');
    helper.addProject(testClient, 'apex-script')
      .then(function(proj) {
        project = proj;
        logger.info('project initied');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
  
  after(function(done) {
    helper.cleanUpTestProject('apex-script');
    done();
  });

  it('should create a new apex script', function(done) {
    this.timeout(10000);  

    testClient.executeCommand('new-apex-script', { name: 'foo' })
      .then(function(response) {
        response.should.have.property('result');
        response.result.should.equal('Apex script created successfully');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts'),  'Apex scripts directory does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts', 'foo.cls'),  'Script file does not exist');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should execute an apex script that fails to compile', function(done) {
    this.timeout(10000);  

    var apexScriptPath = path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts', 'foo.cls');
    fs.outputFileSync(apexScriptPath, 'system.debug(\'hello!\'');

    testClient.executeCommand('run-apex-script', { paths: [ apexScriptPath ] })
      .then(function(response) {
        response.should.have.property('result');
        response.result[path.basename(apexScriptPath)].success.should.equal(false);
        response.result[path.basename(apexScriptPath)].compileProblem.should.equal('expecting a right parentheses, found \'<EOF>\'');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should execute an apex script that compiles successfully', function(done) {
    this.timeout(10000);  

    var apexScriptPath = path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts', 'foo.cls');
    fs.outputFileSync(apexScriptPath, 'system.debug(\'hello!\');');

    testClient.executeCommand('run-apex-script', { paths: [ apexScriptPath ] })
      .then(function(response) {
        response.should.have.property('result');
        response.result[path.basename(apexScriptPath)].success.should.equal(true);
        should.equal(response.result[path.basename(apexScriptPath)].compileProblem, null);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
