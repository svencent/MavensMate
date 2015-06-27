'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

describe('mavensmate execute-apex', function() {

  var project;
  var testClient;
 
  before(function(done) {
    this.timeout(8000);
    helper.unlinkEditor();
    testClient = helper.createClient('atom');
    helper.putTestProjectInTestWorkspace(testClient, 'execute-apex');
    helper.addProject(testClient, 'execute-apex')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
  
  after(function(done) {
    helper.cleanUpTestProject('execute-apex');
    done();
  });

  it('should execute anonymous apex', function(done) {
    this.timeout(10000);  

    testClient.executeCommand('execute-apex', { body: 'String foo = \'bar\';' })
      .then(function(response) {
        
        response.compiled.should.equal(true);
        response.success.should.equal(true);
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should attempt to execute invalid anonymous apex', function(done) {
    this.timeout(10000);  

    testClient.executeCommand('execute-apex', { body: 'String foo = \'bar\'' })
      .then(function(response) {
        
        response.compiled.should.equal(false);
        response.success.should.equal(false);
        response.compileProblem.should.equal('expecting a semi-colon, found \'<EOF>\'');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });
});
