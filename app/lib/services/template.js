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

function TemplateService() { }

TemplateService.prototype.getTemplatesForType = function(metadataTypeXmlName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._getPackage()
      .then(function(pkg) {
        resolve(pkg[metadataTypeXmlName]);
      })
      .catch(function(e) {
        reject(new Error('Could not retrieve templates for type: '+metadataTypeXmlName+', '+e.message));
      })
      .done();
  });
};

TemplateService.prototype.getTemplateBody = function(metadataTypeXmlName, templateOrTemplateFileName) {
  return new Promise(function(resolve, reject) {
    /*jshint camelcase: false */
    var templateFileName = templateOrTemplateFileName.file_name ? templateOrTemplateFileName.file_name : templateOrTemplateFileName; // TODO: standardize format
    var templateSource = config.get('mm_template_source');
    if (templateSource === undefined || templateSource === '') {
      templateSource = 'joeferraro/MavensMate-Templates/master';
    }
    var templateLocation = config.get('mm_template_location');
    if (templateLocation === undefined || templateLocation === '') {
      templateLocation = 'remote';
    }

    logger.debug('templateSource', templateSource);
    logger.debug('templateLocation', templateLocation);

    var templateBody;
    try {
      if (templateLocation === 'remote') {
        request('https://raw.githubusercontent.com/'+templateSource+'/'+metadataTypeXmlName+'/'+templateFileName, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            templateBody = body;
          } else {
            templateBody = util.getFileBodySync(path.join(templateSource,metadataTypeXmlName,templateFileName));
          }
          resolve(templateBody);
        });
      } else if (templateLocation === 'local') {
        templateBody = util.getFileBodySync(path.join(templateSource,metadataTypeXmlName,templateFileName));
        resolve(templateBody);
      } else {
        templateBody = util.getFileBodySync(path.join(__dirname,'templates','github',metadataTypeXmlName,templateFileName));
        resolve(templateBody);
      }
    } catch(e) {
      logger.error('Could not retrieve template body', e);
      templateBody = util.getFileBodySync(path.join(__dirname,'templates','github',metadataTypeXmlName,templateFileName));
      resolve(templateBody);
    }
  });
};

TemplateService.prototype._getPackage = function() {
  return new Promise(function(resolve, reject) {
    /*jshint camelcase: false */
    try {
      var templateSource = config.get('mm_template_source'); // todo: make project specific?
      if (!templateSource) {
        templateSource = 'joeferraro/MavensMate-Templates/master';
      }
      var templateLocation = config.get('mm_template_location'); // todo: make project specific?
      if (!templateLocation) {
        templateLocation = 'remote';
      }

      var templatePackage;
      if (templateLocation === 'remote') {
        request('https://raw.githubusercontent.com/'+templateSource+'/package.json', function(error, response, body) {
          if (!error && response.statusCode === 200) {
            templatePackage = JSON.parse(body);
          } else {
            templatePackage = util.getFileBodySync(path.join(__dirname,'create','templates','apex','github','package.json'), true);
          }
          resolve(templatePackage);
        });
      } else if (templateLocation === 'local') {
        templatePackage = JSON.parse(util.getFileBodySync(path.join(templateSource,'package.json')));
        resolve(templatePackage);
      } else {
        templatePackage = util.getFileBodySync(path.join(__dirname,'create','templates','apex','github','package.json'), true);
        resolve(templatePackage);
      }
    } catch(e) {
      reject(new Error('Could not obtain template package: '+e.message));
    }
    /*jshint camelcase: true */
  });
};

module.exports = TemplateService;