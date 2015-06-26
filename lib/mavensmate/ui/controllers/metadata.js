'use strict';

var Promise         = require('bluebird');
var jobQueue        = require('../../job-queue');
var TemplateService = require('../../template');

var MetadataController = function(req) {
  this.client = req.app.get('client');
  this.swig = req.app.get('swig');
  this.templateService = new TemplateService();
};

MetadataController.prototype._getTemplates = function(typeXmlName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.templateService.getTemplatesForType(typeXmlName)
      .then(function(templates) {
        resolve(templates);
      })
      .catch(function(e) {
        reject(new Error('Could not retrieve templates: '+e.message));
      })
      .done();
  });
};

/**
 * GET (sync)
 */
MetadataController.prototype.new = function(req, res) {
  var self = this;
  if (!req.project) {
    res.status(500).send('Error: No project configured for this MavensMate client.');
  } else {
    self._getTemplates(req.query.type)
      .then(function(templates) {
        var locals = {
          templates : templates,
          metadataType: req.query.type
        };
        res.render('metadata/new.html', locals);
      })
      .catch(function(e) {
        res.render('metadata/new.html', {});
      })
      .done();
  }
};

/**
 * GET (sync)
 */
MetadataController.prototype.template = function(req, res) {
  this.templateService.getTemplateBody(req.query.type, req.query.fileName)
    .then(function(body) {
      res.send(body);
    })
    .catch(function(e) {
      res.status(500).send('Error: '+e.message);
    })
    .done();
};

/**
 * POST (async)
 */
MetadataController.prototype.create = function(req, res) {
  var jobId = jobQueue.addJob();

  this.client.executeCommandForProject(req.project, 'new-metadata', req.body)
    .then(function(response) {
      jobQueue.finish(jobId, null, response);  
    })
    .catch(function(err) {
      jobQueue.finish(jobId, err, null);  
    });
   
  return res.send({
    status: 'pending',
    id: jobId
  });
};

module.exports = MetadataController;