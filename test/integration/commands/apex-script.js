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
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    helper.unlinkEditor();
    logger.info('editor unlinked');
    commandExecutor = helper.getCommandExecutor();
    logger.info('test client ready');
    helper.putTestProjectInTestWorkspace('apex-script');
    logger.info('project in workspace');
    helper.addProject('apex-script')
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
    helper.cleanUpProject('apex-script');
    done();
  });

  it('should create a new apex script', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'new-apex-script',
        body: { name: 'foo' },
        project: project
      })
      .then(function(response) {
        response.message.should.equal('Apex script created successfully');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts'),  'Apex scripts directory does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts', 'foo.cls'),  'Script file does not exist');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should execute an apex script that fails to compile', function(done) {
    this.timeout(120000);

    var apexScriptPath = path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts', 'foo.cls');
    fs.outputFileSync(apexScriptPath, 'system.debug(\'hello!\'');

    commandExecutor.execute({
        name: 'run-apex-script',
        body: { paths: [ apexScriptPath ] },
        project: project
      })
      .then(function(response) {
        response[path.basename(apexScriptPath)].success.should.equal(false);
        response[path.basename(apexScriptPath)].compileProblem.should.equal('expecting a right parentheses, found \'<EOF>\'');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should execute an apex script that compiles successfully', function(done) {
    this.timeout(120000);

    var apexScriptPath = path.join(helper.baseTestDirectory(),'workspace', 'apex-script', 'apex-scripts', 'foo.cls');
    fs.outputFileSync(apexScriptPath, 'system.debug(\'hello!\');');

    commandExecutor.execute({
        name: 'run-apex-script',
        body: { paths: [ apexScriptPath ] },
        project: project
      })
      .then(function(response) {
        response[path.basename(apexScriptPath)].success.should.equal(true);
        should.equal(response[path.basename(apexScriptPath)].compileProblem, null);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
