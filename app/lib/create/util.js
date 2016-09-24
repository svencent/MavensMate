var _               = require('lodash');
var fs              = require('fs-extra-promise');
var Promise         = require('bluebird');
var swig            = require('swig');
var logger          = require('winston');
var TemplateService = require('../create/template');
var path            = require('path');
var util            = require('../util');

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

          var metadataDescribe = _.find(project.sfdcClient.describe.metadataObjects, function(d) {
            return newMetadataTemplate.metadataTypeXmlName === d.xmlName;
          });

          var newFilePath = path.join(project.path, 'src', metadataDescribe.directoryName, [ apiName, metadataDescribe.suffix ].join('.'));
          fs.outputFileSync(newFilePath, newFileBody);
          paths.push(newFilePath);

          if (metadataDescribe.metaFile) {
            var newMetaFilePath = path.join(project.path, 'src', metadataDescribe.directoryName, [ apiName, metadataDescribe.suffix+'-meta.xml' ].join('.'));
            var newMetaFileBody = swig.renderFile(path.join(__dirname, 'templates', 'Other', 'meta.xml'), {
              xmlName: newMetadataTemplate.metadataTypeXmlName,
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