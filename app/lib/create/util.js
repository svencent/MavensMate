var _                   = require('lodash');
var fs                  = require('fs-extra-promise');
var Promise             = require('bluebird');
var swig                = require('swig');
var logger              = require('winston');
var TemplateService     = require('./template');
var LightningDocument   = require('../document/lightning');
var path                = require('path');
var util                = require('../util');

module.exports.mergeLightningTemplateAndWriteToDisk = function(project, newLightningComponent) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      fs.ensureDirSync(path.join(project.path, 'src', 'aura', newLightningComponent.apiName));
      var templateService = new TemplateService();
      var lightningType = newLightningComponent.lightningType;
      var templatePath = path.join(
                          'AuraDefinitionBundle',
                          lightningType,
                          [ lightningType, LightningDocument.getExtensionForType(lightningType)].join('.'))

      templateService.getTemplateBody(templatePath)
        .then(function(templateBody) {
          var lightningType = newLightningComponent.lightningType;
          var newFileBody = swig.render(templateBody); // no locals currently for lightning docs
          var apiName = newLightningComponent.apiName;
          var newFilePath = path.join(
                              project.path,
                              'src',
                              'aura',
                              apiName,
                              LightningDocument.getFileNameForType(apiName, lightningType)
                            );
          fs.outputFileSync(newFilePath, newFileBody);
          // todo: if top-level component (application, component, tokens, event, etc., we need to create a meta-xml file)
          resolve(newFilePath);
        })
        .catch(function(err) {
          reject(err);
        });
    } catch(e) {
      reject(e);
    }
  });
};

/**
 * takes an array of metadata elements, merges the templates and writes them to the disk
 * returns an array of documents. these documents can be passed to the create delegate to create them on the server
 * @param  {Project} project
 * @param  {Object} newMetadataTemplates
 * @return {Array}
 */
module.exports.mergeTemplatesAndWriteToDisk = function(project, newMetadataTemplates) {
  var self = this;
  return new Promise(function(resolve, reject) {
    newMetadataTemplates = util.ensureArrayType(newMetadataTemplates);
    var templateService = new TemplateService();

    var templatePromises = [];
    _.each(newMetadataTemplates, function(newMetadataTemplate) {
      templatePromises.push(templateService.getTemplateBody(newMetadataTemplate.templatePath));
    });

    var paths = [];
    Promise.all(templatePromises)
      .then(function(templateBodies) {
        _.each(newMetadataTemplates, function(newMetadataTemplate, i) {
          var templateBody = templateBodies[i];
          var newFileBody = swig.render(templateBody, { locals: newMetadataTemplate.templateValues });
          var apiName = newMetadataTemplate.templateValues.api_name;
          var xmlName = newMetadataTemplate.metadataTypeXmlName;

          var metadataDescribe = _.find(project.sfdcClient.describe.metadataObjects, function(d) {
            return xmlName === d.xmlName;
          });

          var newFilePath = path.join(
                              project.path,
                              'src',
                              metadataDescribe.directoryName,
                              [ apiName, metadataDescribe.suffix ].join('.')
                            );
          fs.outputFileSync(newFilePath, newFileBody);
          paths.push(newFilePath);

          if (metadataDescribe.metaFile) {
            var newMetaFilePath = path.join(
                                  project.path,
                                  'src',
                                  metadataDescribe.directoryName,
                                  [ apiName, metadataDescribe.suffix+'-meta.xml' ].join('.')
                                );
            var newMetaFileBody = swig.renderFile(path.join(__dirname, 'templates', 'Other', 'meta.xml'), {
              xmlName: xmlName,
              apiName: apiName,
              apiVersion: project.config.get('mm_api_version')
            });
            fs.outputFileSync(newMetaFilePath, newMetaFileBody);
          }
        });
        resolve(paths);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};