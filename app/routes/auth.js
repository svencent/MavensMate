'use strict';

var express         = require('express');
var router          = express.Router();
var inherits        = require('inherits');
var logger          = require('winston');
var querystring     = require('querystring');
var path            = require('path');
var util            = require('../lib/util');

router.get('/new', function(req, res) {
  var project;
  if (req.project) {
    project = req.project;
  } else if (req.query.pid) {
    project = util.getProjectById(req.app, req.query.pid);
  }

  res.render('auth/index.html', {
    project: project,
    title: req.query.title,
    callback: req.query.callback,
    param1: req.query.param1,
    isForced: req.query.forced === '1'
  });
});

router.get('/callback', function(req, res) {
  res.render('auth/callback.html', {
    title: 'Redirecting...'
  });
});

router.post('/', function(req, res) {
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
    response_type: process.env.SFDC_OAUTH_RESPONSE_TYPE || 'token',
    display: 'popup',
    prompt: 'login'
  };
  if (req.body.username) {
    params.login_hint = req.body.username;
  }
  var state = {};
  if (req.body.callback) {
    state.callback = req.body.callback
  }
  if (req.body.pid) {
    state.pid = req.body.pid;
  }
  if (req.body.param1) {
    state.param1 = req.body.param1;
  }
  params.state = JSON.stringify(state);
  var oauthUrl = instanceUrl+'/services/oauth2/authorize?'+querystring.stringify(params);
  logger.debug('oauth url is: ', oauthUrl);
  res.redirect(oauthUrl);
});

router.post('/finish', function(req, res) {
  logger.debug('finishing oauth dance: ', req.body.url);
  var loginInfo = querystring.parse(req.body.url.split('#')[1]);
  var state = JSON.parse(loginInfo.state);
  var callbackUrl = state.callback+'?'+querystring.stringify(loginInfo);
  logger.debug('redirecting to callback', callbackUrl);
  res.redirect(callbackUrl);
});

module.exports = router;