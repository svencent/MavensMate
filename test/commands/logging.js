'use strict';

var helper      = require('../test-helper');
var chai        = require('chai');
var should      = chai.should();

chai.use(require('chai-fs'));

describe('mavensmate logging', function() {

  var testClient = helper.createClient('atom');
  helper.ensureTestProject(testClient, 'logging');
  
  it('should start logging for all user ids listed in config/.debug', function(done) {

    this.timeout(20000);      

    helper.setProject(testClient, 'logging', function() {      
      testClient.executeCommand('start-logging', function(err, response) {
        should.equal(err, null);
        response.should.have.property('result');
        response.result.should.equal('Started logging for debug users');
        done();
      });
    });

  });

  it('should stop logging for all user ids listed in config/.debug', function(done) {

    this.timeout(20000);      

    testClient.executeCommand('stop-logging', function(err, response) {
      should.equal(err, null);
      response.should.have.property('result');
      response.result.should.equal('Stopped logging for debug users');
      done();
    });

    helper.cleanUpTestProject('logging');
  });
});

