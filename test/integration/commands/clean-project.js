'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var assert      = chai.assert;
var should      = chai.should();
var path        = require('path');
var fs          = require('fs-extra');

chai.use(require('chai-fs'));

describe('mavensmate clean-project-command', function() {

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    helper.boostrapEnvironment();
    helper.unlinkEditor();
    commandExecutor = helper.getCommandExecutor();
    helper.putTestProjectInTestWorkspace('clean-project');
    helper.addProject('clean-project')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('clean-project');
    done();
  });

  it('should revert the project to server state based on package.xml', function(done) {
    this.timeout(120000);

    var members = '<types><members>*</members><name>ApexClass</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>36.0</version></Package>';
    fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'clean-project', 'src', 'package.xml'), packageXml);

    commandExecutor.execute({
        name:'clean-project',
        project: project
      })
      .then(function(response) {

        response.message.should.equal('Project cleaned successfully');

        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project'),  'Project directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'config'),  'Project config directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src'),  'Project src directory does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src', 'package.xml'),  'Project package.xml does not exist');

        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should respect the user updating the package.xml file directly', function(done) {
    this.timeout(120000);

    var members = '<types><members>Account</members><name>CustomObject</name></types>';
    var packageXml = '<?xml version="1.0" encoding="UTF-8"?><Package xmlns="http://soap.sforce.com/2006/04/metadata">'+members+'<version>36.0</version></Package>';
    fs.writeFileSync(path.join(helper.baseTestDirectory(), 'workspace', 'clean-project', 'src', 'package.xml'), packageXml);

    commandExecutor.execute({
        name: 'clean-project',
        project: project
      })
      .then(function(response) {

        response.message.should.equal('Project cleaned successfully');

        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project'),  'Project directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'config'),  'Project config directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src'),  'Project src directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src', 'objects'),  'Project src objects directory does not exist');
        fs.existsSync(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src', 'classes')).should.equal(false);
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src', 'package.xml'),  'Project package.xml does not exist');

        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
