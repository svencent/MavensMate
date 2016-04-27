/**
 * @file Base controller
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var jobQueue  = require('../../job-queue');
var index     = require('../../index');

var BaseController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
};

BaseController.prototype.filterMetadataTree = function(req, res) {
  var indexService = new Index({
    project: req.project
  });
  indexService.setVisibility(null, req.query.keyword);
  this.client.executeCommand({
      project: req.project,
      name: 'update-creds',
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

module.exports = BaseController;