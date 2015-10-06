var SalesforceClient  = require('../lib/mavensmate/sfdc-client');
var client            = require('../lib/mavensmate/client');

var sfdcClient = new SalesforceClient({
  username: process.env.SALESFORCE_USERNAME || 'mm4@force.com',
  password: process.env.SALESFORCE_PASSWORD || 'force',
  orgType: process.env.SALESFORCE_ORG_TYPE || 'developer'
});

module.exports = sfdcClient;