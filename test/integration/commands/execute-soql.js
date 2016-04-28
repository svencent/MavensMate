'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate execute-soql', function(){

  var project;
  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace(testClient, 'execute-soql');
    helper.addProject(testClient, 'execute-soql')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpTestProject('execute-soql');
    done();
  });

  it('should successfully execute soql query', function(done) {
    this.timeout(3000);

    testClient.executeCommand({
        name: 'execute-soql',
        body: { soql: 'SELECT ID From Account LIMIT 1' }
      })
      .then(function(res) {
        res.should.have.property('records');
        res.should.have.property('done');
        res.should.have.property('totalSize');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should fail to execute soql query', function(done) {
    this.timeout(3000);

    testClient.executeCommand({
        name: 'execute-soql',
        body: { soql: 'SELECT From Account LIMIT 1' }
      })
      .catch(function(err) {
        err.errorCode.should.contain('MALFORMED_QUERY');
        done();
      });
  });
});