var _               = require('lodash');
var fs              = require('fs-extra-promise');
var Promise         = require('bluebird');
var swig            = require('swig');
var logger          = require('winston');
var TemplateService = require('../services/template');
var path            = require('path');
var util            = require('../util');

module.exports.mergeTemplatesAndWriteToDisk = function(project, newMetadataTemplates) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // takes an array of metadata elements, merges the templates and writes them to the disk
    // returns an array of documents
    // these documents can be passed to the create delegate to create them on the server
    newMetadataTemplates = util.ensureArrayType(newMetadataTemplates);
    var templateService = new TemplateService();

    var templatePromises = [];
    _.each(newMetadataTemplates, function(newMetadataTemplate) {
      templatePromises.push(templateService.getTemplateBody(newMetadataTemplate.metadataTypeXmlName, newMetadataTemplate.template));
    });

    var paths = [];
    Promise.all(templatePromises)
      .then(function(templateBodies) {
        _.each(newMetadataTemplates, function(newMetadataTemplate, i) {
          var templateBody = templateBodies[i];
          var fileBody = swig.render(templateBody, { locals: newMetadataTemplate.templateValues });
          var apiName = newMetadataTemplate.templateValues.api_name;

          var metadataDescribe = _.find(project.sfdcClient.describe.metadataObjects, function(d) {
            return newMetadataTemplate.metadataTypeXmlName === d.xmlName;
          });

          var filePath = path.join(project.path, 'src', metadataDescribe.directoryName, [ apiName, metadataDescribe.suffix ].join('.'));
          fs.outputFileSync(filePath, fileBody);
          paths.push(filePath);

          if (metadataDescribe.metaFile) {
            var metaFilePath = path.join(project.path, 'src', metadataDescribe.directoryName, [ apiName, metadataDescribe.suffix+'-meta.xml' ].join('.'));
            var metaFileBody = swig.renderFile(path.join(__dirname, 'templates', 'meta.xml'), {
              xmlName: newMetadataTemplate.metadataTypeXmlName,
              apiName: apiName,
              apiVersion: project.config.get('mm_api_version')
            });
            fs.outputFileSync(metaFilePath, metaFileBody);
          }
        });
        resolve(paths);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};