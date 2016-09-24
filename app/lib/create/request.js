
var CreateRequest = new function(type, templatePath, templateValues) {
  this.project = project;
  this.type = type;
  this.templatePath = template;
  this.templateValues = templateValues;
};

CreateRequest.prototype._mergeTemplateValues = function() {

};

CreateRequest.prototype._getTemplateBody = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    templateService.getTemplateBody(this.templatePath)
      .then(function(body) {
        resolve(body);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

CreateRequest.prototype._getMetadataTypeDescribe = function() {
  var self = this;
  return _.find(this.project.sfdcClient.describe.metadataObjects, function(d) {
    return self.type === d.xmlName;
  });
};

CreateRequest.prototype.mergeTemplateValues = function() {
  newMetadataTemplates = util.ensureArrayType(newMetadataTemplates);
  var templateService = new TemplateService();

  var templatePromises = [];
  _.each(newMetadataTemplates, function(newMetadataTemplate) {
    templatePromises.push(templateService.getTemplateBody(newMetadataTemplate.metadataTypeXmlName, newMetadataTemplate.template));
  });

  var templateBody = templateBodies[i];
  var newFileBody = swig.render(templateBody, { locals: newMetadataTemplate.templateValues });
  var apiName = newMetadataTemplate.templateValues.api_name;

  var metadataDescribe = self._getMetadataTypeDescribe();

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
}