'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();
var path        = require('path');

describe('mavensmate execute-soql', function(){

  var project;
  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    helper.putTestProjectInTestWorkspace('execute-soql');
    helper.addProject('execute-soql')
      .then(function(proj) {
        project = proj;
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  after(function(done) {
    helper.cleanUpProject('execute-soql');
    done();
  });

  it('should successfully execute soql query', function(done) {
    this.timeout(120000);

    commandExecutor.execute({
        name: 'execute-soql',
        body: { soql: 'SELECT ID From Account LIMIT 1' },
        project: project
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
    this.timeout(120000);

    commandExecutor.execute({
        name: 'execute-soql',
        body: { soql: 'SELECT From Account LIMIT 1' },
        project: project
      })
      .catch(function(err) {
        err.errorCode.should.contain('MALFORMED_QUERY');
        done();
      });
  });
});