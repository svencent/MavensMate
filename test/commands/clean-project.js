'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var assert      = chai.assert;
var should      = chai.should();
var path        = require('path');

chai.use(require('chai-fs'));

describe('mavensmate clean-project', function() {

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'clean-project');
  
  it('should revert the project to server state based on package.xml', function(done) {

    helper.unlinkEditor();
    this.timeout(20000);      

    helper.setProject(testClient, 'clean-project', function() {      
      testClient.executeCommand('clean-project', function(err, response) {
        should.equal(err, null);
        response.should.have.property('result');
        response.result.should.equal('Project cleaned successfully');

        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project'),  'Project directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'config'),  'Project config directory does not exist');
        assert.isDirectory(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src'),  'Project src directory does not exist');
        assert.isFile(path.join(helper.baseTestDirectory(),'workspace', 'clean-project', 'src', 'package.xml'),  'Project package.xml does not exist');

        done();
      });
    });

    helper.cleanUpTestProject('clean-project');
  });
});
