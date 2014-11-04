'use strict';
var Q         = require('q');
var _         = require('lodash');
var tmp       = require('tmp');
var temp      = require('temp');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
var find      = require('findit');
var parseXml  = require('xml2js').parseString;
var config    = require('./config');
var logger    = require('winston');

// Q.longStackSupport = true;

/**
 Example payload: 
{
  "params": {
    "api_name": "MyApexClass"
  },
  "metadata_type": "ApexClass",
  "github_template": {
    "name": "Default",
    "description": "The default template for an Apex Class",
    "author": "MavensMate",
    "file_name": "ApexClass.cls",
    "params": [
      {
        "name": "api_name",
        "description": "Apex Class API Name",
        "default": "MyApexClass"
      }
    ]
  }
}
*/

/**
 * Represents an element of Salesforce.com metadata
 * @constructor
 * @param {Object} [opts] - Options
 * @param {Object} [opts.project] - project instance (optional)
 * @param {String} [opts.path] - file path
 * @param {String} [opts.metadataType] - type of metadata (ApexClass|ApexTrigger|ApexPage|etc.)
 * @param {String} [opts.githubTemplate] - template
 * @param {String} [opts.params] - template params
 */
function Metadata(opts) {
  util.applyProperties(this, opts);
  if (this.githubTemplate !== undefined && this.metadataType !== undefined) {
    this._initializeNew();
  } else if (this.path !== undefined && fs.existsSync(this.path)) {
    this._initializeExisting();
  } else if (this.path !== undefined) {
    throw new Error('Could not locate '+this.path);
  }
  swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
}

/**
 * Constructor for Metadata that does not yet exist in Salesforce
 * @returns {null}
 */
Metadata.prototype._initializeNew = function() {
  this._type = this.project.getMetadataTypeByName(this.metadataType); // todo: project not always defined
  /*jshint camelcase: false */
  this._name = this.params.api_name; // TODO: standardize formats
};

/**
 * Constructor for Metadata that exists in Salesforce
 * @return {null}
 */
Metadata.prototype._initializeExisting = function() {
  if (this.project === undefined) {
    throw new Error('Before initializing existing metadata, you must pass in a Project instance');
  }
  this._type = this.project.getMetadataTypeByPath(this.path);
  this._basename = path.basename(this.path);
  this._name = this._basename.split('.')[0];
  this._ext = this.path.split('.').pop();
  this._id = this.project.localStore[this._basename].id;
};

/**
 * Get metadata type
 * @return {Object}
 */
Metadata.prototype.getType = function() {
  return this._type;
};

Metadata.prototype.getId = function() {
  return this._id;
};

Metadata.prototype.getExtension = function() {
  return this._ext;
};

Metadata.prototype.isToolingType = function() {
  var supportedExtensions = ['cls', 'trigger', 'resource', 'page', 'component'];
  return supportedExtensions.indexOf(this.getExtension()) >= 0;
};

Metadata.prototype.getFileBody = function() {
  if (this._fileBody === undefined) {
    this._fileBody = util.getFileBody(this.path);
  }
  return this._fileBody;
};

/**
 * Returns the MavensMate-Templates template body based on this.githubTemplate
 * @return {Promise} - resolves with {String} template body
 */
Metadata.prototype._getTemplateBody = function() {
  var deferred = Q.defer();
  var self = this;
  /*jshint camelcase: false */
  var templateFileName = self.githubTemplate.file_name; // TODO: standardize format
  var templateSource = config.get('mm_template_source');
  if (templateSource === undefined || templateSource === '') {
    templateSource = 'joeferraro/MavensMate-Templates/master';
  }
  var templateLocation = config.get('mm_template_location');
  if (templateLocation === undefined || templateLocation === '') {
    templateLocation = 'remote';
  }

  var templateBody;
  if (templateLocation === 'remote') {
    request('https://raw.githubusercontent.com/'+templateSource+'/'+self.getType().xmlName+'/'+templateFileName, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        templateBody = body;
      } else {
        templateBody = util.getFileBody(path.join(templateSource,self.getType().xmlName,templateFileName));
      }
      deferred.resolve(templateBody);
    });
  } else {
    templateBody = util.getFileBody(path.join(__dirname,'templates','github',self.getType().xmlName,templateFileName));
    deferred.resolve(templateBody);
  }
  return deferred.promise;
};

/**
 * Renders template(s) and places in appropriate deploy path (typically a temp directory)
 * @param  {String} deployPath
 * @return {Promise}
 */
Metadata.prototype._writeFile = function(deployPath) {
  var deferred = Q.defer();
  var self = this;

  var apiName = self.getName();

  self._getTemplateBody()
    .then(function(templateBody) {
      var filePath = path.join(deployPath, 'unpackaged', self.getType().directoryName, [apiName,self.getType().suffix].join('.'));
      var fileBody = swig.render(templateBody, { locals: self.params });
      fs.outputFileSync(filePath, fileBody);

      if (self.hasMetaFile()) {
        var metaFilePath = path.join(deployPath, 'unpackaged', self.getType().directoryName, [apiName,self.getType().suffix+'-meta.xml'].join('.'));
        var metaFileBody = swig.renderFile('meta.xml', { metadata: self });
        fs.outputFileSync(metaFilePath, metaFileBody);
      }
      deferred.resolve();
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not write metadata file based on template: '+err));
    })
    .done();
  return deferred.promise;
};

/**
 * Returns the name of the metadata. For new (non-server) Metadata, this is the desired name (e.g. MyApexClass)
 * @return {String}
 */
Metadata.prototype.getName = function() {
  return this._name;
};

/**
 * Returns path of the metadata (existing metadata only) (e.g. /project/src/classes/foo.cls)
 * @return {String}
 */
Metadata.prototype.getPath = function() {
  return this.path;
};

/**
 * Returns whether this metadata type requires a corresponding meta file
 * @return {String}
 */
Metadata.prototype.hasMetaFile = function() {
  return this.getType().metaFile === true;
};

/**
 * Takes an array of metadata, generates JavaScript object
 * @param  {Array} Metadata
 * @return {Object} -> { ApexClass:'*', ApexPage:['apage', 'anotherpage'] }, etc.
 */
Metadata.objectify = function(metadata) {
  var pkg = {};

  if (!_.isArray(metadata)) {
    metadata = [metadata];
  }

  _.each(metadata, function(m) {
    var metadataTypeXmlName = m.getType().xmlName;
    if (!_.has(pkg, metadataTypeXmlName)) {
      pkg[metadataTypeXmlName] = [m.getName()];
    } else {
      var value = pkg[metadataTypeXmlName];
      value.push(m.getName());
    }
  });

  return pkg;
};

Metadata.childTypes = [
    {'xmlName' : 'CustomField', 'tagName' : 'fields', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'BusinessProcess', 'tagName' : 'businessProcesses', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'RecordType', 'tagName' : 'recordTypes', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'WebLink', 'tagName' : 'webLinks', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'ValidationRule', 'tagName' : 'validationRules', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'NamedFilter', 'tagName' : 'namedFilters', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'SharingReason', 'tagName' : 'sharingReasons', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'ListView', 'tagName' : 'listViews', 'parentXmlName' : 'CustomObject' }, 
    {'xmlName' : 'FieldSet', 'tagName' : 'fieldSets', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'CustomLabel', 'tagName' : 'customLabels', 'parentXmlName' : 'CustomLabels' },
    {'xmlName' : 'WorkflowAlert', 'tagName' : 'alerts', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowTask', 'tagName' : 'tasks', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowOutboundMessage', 'tagName' : 'outboundMessages', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowFieldUpdate', 'tagName' : 'fieldUpdates', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowRule', 'tagName' : 'rules', 'parentXmlName' : 'WorkFlow' }, 
    {'xmlName' : 'WorkflowEmailRecipient', 'tagName' : 'emailRecipients', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowTimeTrigger', 'tagName' : 'timeTriggers', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowActionReference', 'tagName' : 'actionReferences', 'parentXmlName' : 'Workflow' }
];

module.exports = Metadata;