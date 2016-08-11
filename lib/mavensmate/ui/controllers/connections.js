/**
 * @file Controller for the deploy UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var logger      = require('winston');
var jobQueue    = require('../../job-queue');
var Deploy      = require('../../deploy');
var querystring = require('querystring');

var OrgConnectionsController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

/**
 * GET
 */
OrgConnectionsController.prototype.index = function(req, res) {
  var self = this;
  self.client.executeCommand({
      project: req.project,
      name: 'get-connections',
      editor: req.editor
    })
    .then(function(response) {
      res.render('connections/index.html', {
        connections: response,
        title: 'Org Connections'
      });
    })
    .catch(function(err) {
      logger.error(err);
      res.status(500).send({ error: err.message });
    });
};

/**
 * POST
 */
OrgConnectionsController.prototype.auth = function(req, res) {
  var params = {
    title: 'New Org Connection',
    callback: '/app/connections/finish-auth',
    param1: req.body.name,
    pid: req.body.pid
  };
  res.redirect('/app/auth/index?'+querystring.stringify(params));
};

/**
 * GET (sync)
 */
OrgConnectionsController.prototype.finishAuth = function(req, res) {
  logger.debug('finishing auth in org connections: ', req.query);
  var state = JSON.parse(req.query.state);
  logger.debug('state!', state);
  var pid = state.pid;
  var project = this.client.getProjectById(pid);
  this.client.executeCommand({
    project: project,
    name: 'new-connection',
    body: {
      name: state.param1,
      accessToken: req.query.access_token,
      instanceUrl: req.query.instance_url,
      refreshToken: req.query.refresh_token
    }
  })
  .then(function(response) {
    res.redirect('/app/connections/index?pid='+pid);
  })
  .catch(function(err) {
    res.status(500).send({ error: err.message });
  });
};

/**
 * GET (sync)
 */
OrgConnectionsController.prototype.getConnections = function(req, res) {
  this.client.executeCommand({
      project: req.project,
      name: 'get-connections',
      editor: req.editor
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(function(err) {
      res.status(500).send({ error: err.message });
    });
};

/**
 * POST (sync)
 */
OrgConnectionsController.prototype.newConnection = function(req, res) {
  this.client.executeCommand({
      project: req.project,
      name: 'new-connection',
      body: req.body,
      editor: req.editor
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(function(err) {
      res.status(500).send({ error: err.message });
    });
};

/**
 * POST (sync)
 */
OrgConnectionsController.prototype.deleteConnection = function(req, res) {
  this.client.executeCommand({
      project: req.project,
      name: 'delete-connection',
      body: req.body,
      editor: req.editor
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(function(err) {
      res.status(500).send({ error: err.message });
    });
};

module.exports = OrgConnectionsController;