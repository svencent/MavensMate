'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

chai.use(require('chai-fs'));

describe('mavensmate session', function() {

  var commandExecutor;

  before(function(done) {
    this.timeout(120000);
    commandExecutor = helper.getCommandExecutor();
    helper.unlinkEditor();
    done();
  });

  it('should initiate new salesforce session', function(done) {
    this.timeout(120000);
    var creds = helper.getTestCreds();
    var payload = {
      username: creds.username,
      password: creds.password,
      orgType: creds.orgType,
      subscription: ['ApexClass']
    };

    commandExecutor.execute({
        name: 'session',
        body: payload
      })
      .then(function(response) {
        response.should.have.property('sid');
        response.should.have.property('urls');
        response.should.have.property('metadataTypes');
        response.should.have.property('instanceUrl');
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  it('should fail to initiate new salesforce session', function(done) {
    this.timeout(120000);

    var payload = {
      username: 'thiswontwork@foo.com',
      password: 'barbar',
      orgType: 'sandbox'
    };

    commandExecutor.execute({
        name: 'session',
        body: payload
      })
      .catch(function(err) {
        err.message.should.equal('INVALID_LOGIN: Invalid username, password, security token; or user locked out.');
        done();
      });
  });
});

