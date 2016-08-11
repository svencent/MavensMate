/**
 * @file Controller for the various project UIs (new, edit)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var inherits        = require('inherits');
var logger          = require('winston');
var querystring     = require('querystring');
var jobQueue        = require('../../job-queue');
var BaseController  = require('./base');

var AuthController = function() {
  AuthController.super_.call(this, arguments[0]);
};

inherits(AuthController, BaseController);

/**
 * GET
 */
AuthController.prototype.index = function(req, res) {
  res.render('auth/index.html', {
    project: req.project,
    title: req.query.title,
    callback: req.query.callback
  });
};

/**
 * GET
 */
AuthController.prototype.callback = function(req, res) {
  res.render('auth/callback.html', {
    title: 'Redirecting...'
  });
};

/**
 * POST (sync)
 */
AuthController.prototype.start = function(req, res) {
  var orgType = req.body.orgType;
  var instanceUrl = req.body.instanceUrl;
  if (!instanceUrl) {
    if (orgType === 'sandbox') {
      instanceUrl = 'https://test.salesforce.com/';
    } else {
      instanceUrl = 'https://login.salesforce.com/';
    }
  }
  var params = {
    client_id: process.env.SFDC_OAUTH_CLIENT_ID || '3MVG9uudbyLbNPZP7kLgoRiWVRqiN8gFcKwdAlztVnjgbj9shSk1vMXJNmV7W0ciFbeYiaP9D4tLfBBD06l_7',
    redirect_uri: process.env.SFDC_OAUTH_CALLBACK_URL || 'https://localhost:56248/sfdc/auth/callback',
    response_type: process.env.SFDC_OAUTH_RESPONSE_TYPE || 'token'
  };
  if (req.body.pid) {
    params.state = req.body.pid + ';' + '/app/project/edit'; // project id and destination for callback
  }
  var state = {};
  if (req.body.callback) {
    state.callback = req.body.callback
  }
  if (req.body.pid) {
    state.pid = req.body.pid;
  }
  params.state = JSON.stringify(state);
  var oauthUrl = instanceUrl+'/services/oauth2/authorize?'+querystring.stringify(params);
  logger.debug('oauth url is: ', oauthUrl);
  res.redirect(oauthUrl);
};

/**
 * POST (sync)
 */
AuthController.prototype.finish = function(req, res) {
  logger.debug('finishing oauth dance: ', req.body.url);
  var loginInfo = querystring.parse(req.body.url.split('#')[1]);
  var state = JSON.parse(loginInfo.state);
  var callbackUrl = state.callback+'?'+querystring.stringify(loginInfo);
  logger.debug('redirecting to callback', callbackUrl);
  res.redirect(callbackUrl);
};

module.exports = AuthController;