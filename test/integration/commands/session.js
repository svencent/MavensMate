'use strict';

var helper      = require('../../test-helper');
var chai        = require('chai');
var should      = chai.should();

chai.use(require('chai-fs'));

describe('mavensmate session', function() {

  var testClient;

  before(function(done) {
    this.timeout(8000);
    testClient = helper.createClient('unittest');
    helper.unlinkEditor();
    done();
  });

  it('should initiate new salesforce session', function(done) {
    this.timeout(20000);

    var payload = {
      username: process.env.SALESFORCE_USERNAME || 'mm4@force.com',
      password: process.env.SALESFORCE_PASSWORD || 'force',
      orgType: process.env.SALESFORCE_ORG_TYPE || 'developer',
      subscription: ['ApexClass']
    };

    testClient.executeCommand({
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
    this.timeout(20000);

    var payload = {
      username: 'thiswontwork@foo.com',
      password: 'barbar',
      orgType: 'sandbox'
    };

    testClient.executeCommand({
        name: 'session',
        body: payload
      })
      .catch(function(err) {
        err.message.should.equal('INVALID_LOGIN: Invalid username, password, security token; or user locked out.');
        done();
      });
  });
});

