/**
 * @file Service for retrieving MavensMate templates from their local or remote source
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var Promise   = require('bluebird');
var path      = require('path');
var util      = require('../util');
var request   = require('request');
var config    = require('../../config');
var logger    = require('winston');

function TemplateService() {
  this.localPath = path.join(__dirname, 'create', 'templates');
  this.templateSource = config.get('mm_template_source') || 'joeferraro/MavensMate-Templates/master';
  this.templateLocation = config.get('mm_template_location') || 'remote';
}

TemplateService.prototype.getTemplatesForType = function(metadataTypeXmlName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._getTemplatePackage()
      .then(function(pkg) {
        resolve(pkg[metadataTypeXmlName]);
      })
      .catch(function(e) {
        reject(new Error('Could not retrieve templates for type: '+metadataTypeXmlName+', '+e.message));
      })
      .done();
  });
};

TemplateService.prototype._getTemplatePackage = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var templatePackage;
      if (self.templateLocation === 'remote') {
        // request from github, fallback locally
        request('https://raw.githubusercontent.com/'+self.templateSource+'/package.json', function(error, response, body) {
          if (!error && response.statusCode === 200) {
            templatePackage = JSON.parse(body);
          } else {
            logger.warn('Could not get template package remotely', error);
            templatePackage = util.getFileBodySync(path.join(self.localPath, 'package.json'), true);
          }
          resolve(templatePackage);
        });
      } else if (self.templateLocation === 'local') {
        // request from custom local path
        templatePackage = JSON.parse(util.getFileBodySync(path.join(self.templateSource, 'package.json')));
        resolve(templatePackage);
      } else {
        // else request from mavensmate default
        templatePackage = util.getFileBodySync(path.join(self.localPath, 'package.json'), true);
        resolve(templatePackage);
      }
    } catch(e) {
      reject(new Error('Could not obtain template package: '+e.message));
    }
  });
};

TemplateService.prototype.getTemplateBody = function(templatePath) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var templateBody;
    try {
      if (self.templateLocation === 'remote') {
        // request from github, fallback locally
        request('https://raw.githubusercontent.com/'+self.templateSource+'/'+templatePath.replace(/\\/g, '/'), function(error, response, body) {
          if (!error && response.statusCode === 200) {
            logger.warn('Could not get template body remotely', error);
            templateBody = body;
          } else {
            templateBody = util.getFileBodySync(path.join(self.localPath, templatePath));
          }
          resolve(templateBody);
        });
      } else if (self.templateLocation === 'local') {
        // request from custom local path
        templateBody = util.getFileBodySync(path.join(self.templateSource, templatePath));
        resolve(templateBody);
      } else {
        // else request from mavensmate default
        templateBody = util.getFileBodySync(path.join(self.localPath, templatePath));
        resolve(templateBody);
      }
    } catch(e) {
      logger.error('Could not retrieve template body', e);
      templateBody = util.getFileBodySync(path.join(self.localPath, templatePath));
    }
  });
};

module.exports = TemplateService;