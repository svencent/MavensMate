var SalesforceClient  = require('../lib/mavensmate/sfdc-client');
var client            = require('../lib/mavensmate/client');
var helper            = require('./test-helper');

var creds = helper.getTestCreds();

var sfdcClient = new SalesforceClient({
  username: creds.username,
  password: creds.password,
  orgType: creds.environment
});

module.exports = sfdcClient;