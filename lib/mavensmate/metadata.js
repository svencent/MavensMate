'use strict';
var Promise         = require('bluebird');
var _         = require('lodash');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
var config    = require('./config');
var logger    = require('winston');

var Metadata, MetadataService;

/**
 Example payload for template-based Metadata instantiation: 
{
  "paramValues": {
    "api_name": "MyApexClass"
  },
  "metadata_type": "ApexClass",
  "template": {
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
 Example payload for path-based Metadata instantiation: 
{
  "project": [Object],
  "path": "/path/to/project/src/classes/foo.cls"
}
*/

/**
 * Represents an element of Salesforce.com metadata
 * @constructor
 * @param {Object} [opts] - Options
 * @param {Object} [opts.project] - project instance (optional)
 * @param {String} [opts.path] - file path
 * @param {String} [opts.metadataTypeXmlName] - xml name for type of metadata (ApexClass|ApexTrigger|ApexPage|etc.)
 * @param {String} [opts.template] - template
 * @param {String} [opts.paramValues] - template merge values
 */
Metadata = function(opts) {
  util.applyProperties(this, opts);
  
  // if (!this.project && !this.sfdcClient) {
  //   throw new Error('You must provide either a valid project instance or valid sfdc-client instance.');
  // }
  
  if (this.sfdcClient || this.project) {
    this.metadataService = new MetadataService({ sfdcClient : this.sfdcClient || this.project.sfdcClient });
  } else {
    this.metadataService = new MetadataService();
  }
  
  if (this.metadataTypeXmlName) {
    this.type = this.metadataService.getTypeByXmlName(this.metadataTypeXmlName); 
    if (this.template) {
      /*jshint camelcase: false */
      if (this.paramValues) {
        this.name = this.paramValues.api_name || this.paramValues.apiName; // TODO: standardize formats
      } else if (this.apiName) {
        this.name = this.apiName;
      } else {
        throw new Error('Could not instantiate Metadata instance. Please specify API name.');
      }
      /*jshint camelcase: true */      
    } else {
      this.name = this.apiName || this.name;
    }
    if (!this.name) {
      throw new Error('Could not instantiate Metadata instance. Please specify API name.');
    }
  } else if (this.path) {
    this.type = this.metadataService.getTypeByPath(this.path);
    if (!this.type) {
      throw new Error('Could not instantiate Metadata instance. Could not determine metadata type for path: '+this.path);
    }
    this.basename = path.basename(this.path);
    this.name = this.basename.split('.')[0]; 
    this.extension = path.extname(this.path).replace(/./, '');
    if (!this.extension) {
      throw new Error('Unable to determine metadata extension');
    }  
    try {  
      // determine id (useful for lightning/apex/vf types bc tooling api is preferential to ids)
      if (this.isLightningType() && this.project) {
        var lightningIndex = this.project.getLightningIndexSync();
        this.id = _.find(lightningIndex, { AuraDefinitionBundle : { DeveloperName: this.lightningBaseName }, DefType: this.getLightningDefinitionType() }).Id;
      } else {
        this.id = this.project.getLocalStore()[this.basename].id;
      }
    } catch(e){
      logger.debug('Could not determine metadata id: '+e.message);
    }
    logger.debug('metadata initiated: '+this.extension+', '+this.name+', '+this.basename);
  } else {
    throw new Error('Could not instantiate Metadata instance. Please provide a template and metadataTypeXmlName or a path.');
  }
  swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
};

Metadata.prototype._id = null;
Metadata.prototype._body = null;
Metadata.prototype._path = null;
Metadata.prototype._type = null;
Metadata.prototype._basename = null;
Metadata.prototype._name = null;
Metadata.prototype._extension = null;

/**
 * Metadata body (source code, conents, etc.)
 */
Object.defineProperty(Metadata.prototype, 'body', {
  get: function() {
    if (!this._body && this.path) {
      this._body = util.getFileBody(this.path);
    }
    return this._body;
  },
  set: function(value) {
    this._body = value;
  }
});

/**
 * Path of the metadata (e.g. /project/src/classes/foo.cls)
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'path', {
  get: function() {
    return this._path;
  },
  set: function(value) {
    this._path = value;
  }
});

/**
 * Type of the metadata (e.g. ApexClass)
 * @return {Object}
 */
Object.defineProperty(Metadata.prototype, 'type', {
  get: function() {
    return this._type;
  },
  set: function(value) {
    this._type = value;
  }
});

/**
 * Id of the metadata
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'id', {
  get: function() {
    return this._id;
  },
  set: function(value) {
    this._id = value;
  }
});

/**
 * basename of the metadata
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'basename', {
  get: function() {
    return this._basename;
  },
  set: function(value) {
    this._basename = value;
  }
});

/**
 * Name of the metadata. For new (non-server) Metadata, this is the desired name (e.g. MyApexClass)
 * @return {String}
 */
 Object.defineProperty(Metadata.prototype, 'name', {
   get: function() {
     return this._name;
   },
   set: function(value) {
     this._name = value;
   }
 });

/**
* Returns the name of the metadata. For new (non-server) Metadata, this is the desired name (e.g. MyApexClass)
* @return {String}
*/
Object.defineProperty(Metadata.prototype, 'extension', {
  get: function() {
    return this._extension;
  },
  set: function(value) {
    this._extension = value;
  }
});

/**
* Whether the instance exists on the disk (or virtual disk (future))
* @return {Boolean}
*/
Object.defineProperty(Metadata.prototype, 'existsOnFileSystem', {
  get: function() {
    return this.path ? fs.existsSync(this.path) : false;
  },
});

/**
 * Returns whether this metadata type requires a corresponding meta file
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'hasMetaFile', {
  get: function() {
    return this.type.metaFile === true;
  },
});

/**
 * Returns base name of lightning component (e.g. fooRenderer -> foo)
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'lightningBaseName', {
  get: function() {
    var lbn = this.name;
    if (util.endsWith('Controller')) {
      lbn = lbn.replace(/Controller/, '');
    } else if (util.endsWith('Helper')) {
      lbn = lbn.replace(/Helper/, '');
    } if (util.endsWith('Renderer')) {
      lbn = lbn.replace(/Renderer/, '');
    }
    return lbn;
  },
});

/**
 * Whether this is a -meta.xml file
 * @return {Boolean}
 */
Metadata.prototype.isMetaFile = function() {
  return util.endsWith(this.path, '-meta.xml');
};

Metadata.prototype.isLightningType = function() {
  return this.type.xmlName === 'AuraDefinitionBundle';
};

Metadata.prototype.getLightningDefinitionType = function() {
  if (this.extension === 'css') {
    return 'STYLE';
  } else if (this.extension === 'app') {
    return 'APPLICATION';
  } else if (this.extension === 'auradoc') {
    return 'DOCUMENTATION';
  } else if (this.extension === 'cmp') {
    return 'COMPONENT';
  } else if (this.extension === 'evt') {
    return 'EVENT';
  } else if (this.extension === 'intf') {
    return 'INTERFACE';
  } else if (this.extension === 'js') {
    var basename = this.name;
    if (util.endsWith(basename, 'Controller')) {
      return 'CONTROLLER';
    } else if (util.endsWith(basename, 'Helper')) {
      return 'HELPER';
    }  else if (util.endsWith(basename, 'Renderer')) {
      return 'RENDERER';
    }
  } 
};

Metadata.prototype.isToolingType = function() {
  var supportedExtensions = ['cls', 'trigger', 'page', 'component'];
  return supportedExtensions.indexOf(this.extension) >= 0 || this.type.xmlName === 'AuraDefinitionBundle';
};

Metadata.prototype.toString = function() {
  var ret = {
    name : this.name,
    path: this.path,
    type: this.type,
    id: this.id,
    extension: this.extension,
    existsOnFileSystem: this.existsOnFileSystem
  };
  return JSON.stringify(ret);
};

/**
 * Returns the MavensMate-Templates template body based on this.template
 * @return {Promise} - resolves with {String} template body
 */
Metadata.prototype._getTemplateBody = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    /*jshint camelcase: false */
    var templateFileName = self.template.file_name; // TODO: standardize format
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
      request('https://raw.githubusercontent.com/'+templateSource+'/'+self.type.xmlName+'/'+templateFileName, function(error, response, body) {
        if (!error && response.statusCode === 200) {
          templateBody = body;
        } else {
          templateBody = util.getFileBody(path.join(templateSource,self.type.xmlName,templateFileName));
        }
        resolve(templateBody);
      });
    } else {
      templateBody = util.getFileBody(path.join(__dirname,'templates','github',self.type.xmlName,templateFileName));
      resolve(templateBody);
    }
  });
};

/**
 * Renders template and writes to appropriate destination
 * @param  {String} deployPath
 * @return {Promise}
 */
Metadata.prototype.renderAndWriteToDisk = function(destination) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var apiName = self.name;
    self._getTemplateBody()
      .then(function(templateBody) {
        var filePath = path.join(destination, self.type.directoryName, [apiName,self.type.suffix].join('.'));
        var fileBody = swig.render(templateBody, { locals: self.paramValues });
        fs.outputFileSync(filePath, fileBody);

        if (self.hasMetaFile) {
          var metaFilePath = path.join(destination, self.type.directoryName, [apiName,self.type.suffix+'-meta.xml'].join('.'));
          var metaFileBody = swig.renderFile('meta.xml', { 
            metadata: self,
            apiVersion: config.get('mm_api_version')
          });
          fs.outputFileSync(metaFilePath, metaFileBody);
        }
        resolve();
      })
      .catch(function(err) {
        reject(new Error('Could not write metadata file based on template: '+err));
      })
      .done();
    });
};

Metadata.prototype.writeToDisk = function(body) {
  body = body || '';
  if (this.path) {
    fs.outputFileSync(this.path);
  } else if (!this.path && this.project) {
    fs.ensureDirSync(path.join(this.project.path, 'src', this.type.directoryName));
    if (this.isLightningType() && this.getLightningDefinitionType() === 'BUNDLE') {
      this.path = path.join(this.project.path, 'src', this.type.directoryName);
    } else {
      if (this.type.inFolder) {
        // to do
      } else if (this.isLightningType() && this.getLightningDefinitionType() !== 'BUNDLE') {
        fs.outputFileSync(path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.')), body);
        this.path = path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.'));
      } else {
        fs.outputFileSync(path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.')), body);
        this.path = path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.'));
      }
    }
  } else {
    throw new Error('Could not write to disk. No valid path or project could be found.');
  }
};

Metadata.prototype.deleteFromLocalFileSystem = function() {
  if (this.hasMetaFile && fs.existsSync(this.path+'-meta.xml')) {
    fs.remove(this.path+'-meta.xml');
  }
  if (this.existsOnFileSystem) {
    fs.remove(this.path);    
  }
};

MetadataService = function(opts) {
  util.applyProperties(this, opts);
  if (this.sfdcClient) {
    if (this.sfdcClient.describeCache && this.sfdcClient.describeCache.metadataObjects) {
      this.describe = this.sfdcClient.describeCache;
    } else {
      this.describe = {};
      this.describe.metadataObjects = this.parentTypes;
    }
  } else {
    this.describe = {};
    this.describe.metadataObjects = this.parentTypes;
  }
};

/**
 * Attempts to get the metadata type based on the supplied path (could be file path or directory path)
 * @param  {String} p - /path/to/some/metadata.foo
 * @return {Object}
 */
MetadataService.prototype.getTypeByPath = function(p) {
  var parentPath = path.dirname(p);
  var grandparentPath = path.dirname(path.dirname(p));
  if (!path.extname(p) && path.basename(parentPath) === 'aura') {
    return this.getTypeByDirectoryName('aura');
  } else if (path.basename(grandparentPath) === 'aura') {
    return this.getTypeByDirectoryName('aura');
  } else {    
    var folderBasedTypes = _.where(this.parentTypes, { 'inFolder': true });

    // directory handling
    if (!path.extname(p)) {
      
      // foo/bar/src/classes
      var directoryMatch = _.find(this.parentTypes, { 'directoryName': path.basename(p) });
      if (directoryMatch) {
        return this.getTypeByDirectoryName(path.basename(p)); 
      }

      //foo/bar/src/reports/myreportfolder
      var parentFolderDirectoryMatch = _.find(folderBasedTypes, { 'directoryName': path.basename(parentPath) });
      if (parentFolderDirectoryMatch) {
        return this.getTypeByDirectoryName(path.basename(parentPath)); 
      }
    }

    var ext;
    if (util.endsWith(p, '-meta.xml')) {
      ext = p.replace('-meta.xml', '').split('.').pop();
    } else {
      ext = p.split('.').pop();
    }
    var typeBySuffix = this.getTypeBySuffix(ext); 
    if (typeBySuffix) {
      return typeBySuffix;
    }

    //deeply-nested file handling (report/email template/document)
    //foo/bar/src/email/myfolder/foo.email
    var grandparentFolderDirectoryMatch = _.find(folderBasedTypes, { 'directoryName': path.basename(grandparentPath) });
    if (grandparentFolderDirectoryMatch) {
      return this.getTypeByDirectoryName(path.basename(grandparentPath)); 
    }

    // email templates, for example, will have a -meta.xml file that holds folder metadata
    if (util.endsWith(p, '-meta.xml')) {
      return this.getTypeByDirectoryName(path.basename(parentPath)); 
    }
  }
};

/**
 * Gets metadata type based on the supplied name
 * @param  {String} name - ApexClass|ApexPage|etc.
 * @return {Object}
 */
MetadataService.prototype.getTypeByXmlName = function(name) {
  var type;
  var self = this;
  _.each(self.describe.metadataObjects, function(metadataType) {
    if (metadataType.xmlName === name) {
      type = metadataType;
      return false;
    }
  });
  if (type === undefined) {
    _.each(self.childTypes, function(childType) {
      if (childType.xmlName === name) {
        type = childType;
        return false;
      }
    });  
  }
  logger.debug('getting metadata type by name: '+name);
  logger.debug(type);
  return type;
};

/**
 * Gets metadata type based on the supplied suffix
 * @param  {String} suffix - cls|trigger|page|component|etc.
 * @return {Object}
 */
MetadataService.prototype.getTypeBySuffix = function(suffix) {
  var type;
  var self = this;
  if (suffix.indexOf('.') >= 0) {
    suffix = suffix.replace(/\./g, '');
  }
  _.each(self.describe.metadataObjects, function(metadataType) {
    if (metadataType.suffix === suffix) {
      type = metadataType;
      return false;
    }
  });
  return type;
};

/**
 * Gets metadata type based on the supplied directory name
 * @param  {String} suffix - pages|triggers|classes|etc.
 * @return {Object}
 */
MetadataService.prototype.getTypeByDirectoryName = function(dirName) {
  var type;
  var self = this;
  _.each(self.describe.metadataObjects, function(metadataType) {
    if (metadataType.directoryName === dirName) {
      type = metadataType;
      return false;
    }
  });
  if (type === undefined) {
    _.each(self.parentTypes, function(parentType) {
      if (parentType.directoryName === dirName) {
        type = parentType;
        return false;
      }
    });  
  }
  return type;
};

MetadataService.prototype.childTypes = [
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

MetadataService.prototype.parentTypes = [
    {
        'directoryName': 'installedPackages', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'installedPackage', 
        'xmlName': 'InstalledPackage'
    }, 
    {
        'childXmlNames': 'CustomLabel', 
        'directoryName': 'labels', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'labels', 
        'xmlName': 'CustomLabels'
    }, 
    {
        'directoryName': 'staticresources', 
        'inFolder': false, 
        'metaFile': true, 
        'suffix': 'resource', 
        'xmlName': 'StaticResource'
    }, 
    {
        'directoryName': 'scontrols', 
        'inFolder': false, 
        'metaFile': true, 
        'suffix': 'scf', 
        'xmlName': 'Scontrol'
    }, 
    {
        'directoryName': 'components', 
        'inFolder': false, 
        'metaFile': true, 
        'suffix': 'component', 
        'xmlName': 'ApexComponent'
    }, 
    {
        'directoryName': 'pages', 
        'inFolder': false, 
        'metaFile': true, 
        'suffix': 'page', 
        'xmlName': 'ApexPage'
    }, 
    {
        'directoryName': 'queues', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'queue', 
        'xmlName': 'Queue'
    }, 
    {
        'childXmlNames': [
            'CustomField', 
            'BusinessProcess', 
            'CompactLayout', 
            'RecordType', 
            'WebLink', 
            'ValidationRule', 
            'NamedFilter', 
            'SharingReason', 
            'ListView', 
            'FieldSet', 
            'ApexTriggerCoupling'
        ], 
        'directoryName': 'objects', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'object', 
        'xmlName': 'CustomObject'
    }, 
    {
        'directoryName': 'reportTypes', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'reportType', 
        'xmlName': 'ReportType'
    }, 
    {
        'directoryName': 'reports', 
        'inFolder': true, 
        'metaFile': false, 
        'suffix': 'report', 
        'xmlName': 'Report'
    }, 
    {
        'directoryName': 'dashboards', 
        'inFolder': true, 
        'metaFile': false, 
        'suffix': 'dashboard', 
        'xmlName': 'Dashboard'
    }, 
    {
        'directoryName': 'analyticSnapshots', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'snapshot', 
        'xmlName': 'AnalyticSnapshot'
    }, 
    {
        'directoryName': 'layouts', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'layout', 
        'xmlName': 'Layout'
    }, 
    {
        'directoryName': 'portals', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'portal', 
        'xmlName': 'Portal'
    }, 
    {
        'directoryName': 'documents', 
        'inFolder': true, 
        'metaFile': true, 
        'xmlName': 'Document'
    }, 
    {
        'directoryName': 'weblinks', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'weblink', 
        'xmlName': 'CustomPageWebLink'
    }, 
    {
        'directoryName': 'quickActions', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'quickAction', 
        'xmlName': 'QuickAction'
    }, 
    {
        'childXmlNames': {
            '@xsi:nil': 'true'
        }, 
        'directoryName': 'flexipages', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'flexipage', 
        'xmlName': 'FlexiPage'
    }, 
    {
        'directoryName': 'tabs', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'tab', 
        'xmlName': 'CustomTab'
    }, 
    {
        'directoryName': 'customApplicationComponents', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'customApplicationComponent', 
        'xmlName': 'CustomApplicationComponent'
    }, 
    {
        'directoryName': 'applications', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'app', 
        'xmlName': 'CustomApplication'
    }, 
    {
        'directoryName': 'letterhead', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'letter', 
        'xmlName': 'Letterhead'
    }, 
    {
        'directoryName': 'email', 
        'inFolder': true, 
        'metaFile': true, 
        'suffix': 'email', 
        'xmlName': 'EmailTemplate'
    }, 
    {
        'childXmlNames': [
            'WorkflowFieldUpdate', 
            'WorkflowKnowledgePublish', 
            'WorkflowQuickCreate', 
            'WorkflowTask', 
            'WorkflowChatterPost', 
            'WorkflowAlert', 
            'WorkflowSend', 
            'WorkflowOutboundMessage', 
            'WorkflowActionFlow', 
            'WorkflowApex', 
            'WorkflowRule', 
            {
                '@xsi:nil': 'true'
            }
        ], 
        'directoryName': 'workflows', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'workflow', 
        'xmlName': 'Workflow'
    }, 
    {
        'childXmlNames': 'AssignmentRule', 
        'directoryName': 'assignmentRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'assignmentRules', 
        'xmlName': 'AssignmentRules'
    }, 
    {
        'childXmlNames': 'AutoResponseRule', 
        'directoryName': 'autoResponseRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'autoResponseRules', 
        'xmlName': 'AutoResponseRules'
    }, 
    {
        'childXmlNames': 'EscalationRule', 
        'directoryName': 'escalationRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'escalationRules', 
        'xmlName': 'EscalationRules'
    }, 
    {
        'directoryName': 'roles', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'role', 
        'xmlName': 'Role'
    }, 
    {
        'directoryName': 'groups', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'group', 
        'xmlName': 'Group'
    }, 
    {
        'directoryName': 'postTemplates', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'postTemplate', 
        'xmlName': 'PostTemplate'
    }, 
    {
        'directoryName': 'approvalProcesses', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'approvalProcess', 
        'xmlName': 'ApprovalProcess'
    }, 
    {
        'directoryName': 'homePageComponents', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'homePageComponent', 
        'xmlName': 'HomePageComponent'
    }, 
    {
        'directoryName': 'homePageLayouts', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'homePageLayout', 
        'xmlName': 'HomePageLayout'
    }, 
    {
        'directoryName': 'objectTranslations', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'objectTranslation', 
        'xmlName': 'CustomObjectTranslation'
    }, 
    {
        'directoryName': 'flows', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'flow', 
        'xmlName': 'Flow'
    }, 
    {
        'directoryName': 'classes', 
        'inFolder': false, 
        'metaFile': true, 
        'suffix': 'cls', 
        'xmlName': 'ApexClass'
    }, 
    {
        'directoryName': 'triggers', 
        'inFolder': false, 
        'metaFile': true, 
        'suffix': 'trigger', 
        'xmlName': 'ApexTrigger'
    }, 
    {
        'directoryName': 'profiles', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'profile', 
        'xmlName': 'Profile'
    }, 
    {
        'directoryName': 'permissionsets', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'permissionset', 
        'xmlName': 'PermissionSet'
    }, 
    {
        'directoryName': 'datacategorygroups', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'datacategorygroup', 
        'xmlName': 'DataCategoryGroup'
    }, 
    {
        'directoryName': 'remoteSiteSettings', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'remoteSite', 
        'xmlName': 'RemoteSiteSetting'
    }, 
    {
        'directoryName': 'authproviders', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'authprovider', 
        'xmlName': 'AuthProvider'
    }, 
    {
        'childXmlNames': [
            'LeadOwnerSharingRule', 
            'LeadCriteriaBasedSharingRule'
        ], 
        'directoryName': 'leadSharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'LeadSharingRules'
    }, 
    {
        'childXmlNames': [
            'CampaignOwnerSharingRule', 
            'CampaignCriteriaBasedSharingRule'
        ], 
        'directoryName': 'campaignSharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'CampaignSharingRules'
    }, 
    {
        'childXmlNames': [
            'CaseOwnerSharingRule', 
            'CaseCriteriaBasedSharingRule'
        ], 
        'directoryName': 'caseSharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'CaseSharingRules'
    }, 
    {
        'childXmlNames': [
            'ContactOwnerSharingRule', 
            'ContactCriteriaBasedSharingRule'
        ], 
        'directoryName': 'contactSharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'ContactSharingRules'
    }, 
    {
        'childXmlNames': [
            'OpportunityOwnerSharingRule', 
            'OpportunityCriteriaBasedSharingRule'
        ], 
        'directoryName': 'opportunitySharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'OpportunitySharingRules'
    }, 
    {
        'childXmlNames': [
            'AccountOwnerSharingRule', 
            'AccountCriteriaBasedSharingRule'
        ], 
        'directoryName': 'accountSharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'AccountSharingRules'
    }, 
    {
        'childXmlNames': [
            'CustomObjectOwnerSharingRule', 
            'CustomObjectCriteriaBasedSharingRule'
        ], 
        'directoryName': 'customObjectSharingRules', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'sharingRules', 
        'xmlName': 'CustomObjectSharingRules'
    }, 
    {
        'directoryName': 'communities', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'community', 
        'xmlName': 'Community'
    }, 
    {
        'directoryName': 'callCenters', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'callCenter', 
        'xmlName': 'CallCenter'
    }, 
    {
        'directoryName': 'connectedApps', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'connectedApp', 
        'xmlName': 'ConnectedApp'
    }, 
    {
        'directoryName': 'samlssoconfigs', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'samlssoconfig', 
        'xmlName': 'SamlSsoConfig'
    }, 
    {
        'directoryName': 'synonymDictionaries', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'synonymDictionary', 
        'xmlName': 'SynonymDictionary'
    }, 
    {
        'directoryName': 'settings', 
        'inFolder': false, 
        'metaFile': false, 
        'suffix': 'settings', 
        'xmlName': 'Settings'
    },
    {
      'directoryName': 'aura',
      'inFolder': false,
      'metaFile': false,
      'xmlName': 'AuraDefinitionBundle'
    }
];

/**
 * Takes an array of file paths or directories, generates Metadata instances for each (was Metadata.classify)
 * When directories are passed, we need to look at the project's subscription/index to include those metadata instances
 *   > the exception to this is lightning metadata which is a wacky type that is not technically "inFolder" but is bundle-based
 * @param  {Array} files
 * @return {Array of Metadata}
 */
MetadataService.prototype.getMetadataFromPaths = function(paths, project) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var metadata = [];
    var projectMetadataIndex;
    project.getOrgMetadataIndex()
      .then(function(pindex) {
        projectMetadataIndex = pindex;
        _.each(paths, function(p) {
          if (!path.extname(p)) { // this is a directory, need to create metadata instances for all package members for that type
            var metadataType = self.getTypeByPath(p);
            var typePackageSubscription = project.packageXml.subscription[metadataType.xmlName];
            logger.debug('getting metadata for directory: '+p);
            logger.debug(metadataType);
            logger.debug(typePackageSubscription);
            if (typePackageSubscription === '*') {
              var indexItem = _.find(projectMetadataIndex, { id: metadataType.xmlName });
              if (indexItem) {
                _.each(indexItem.children, function(child) {
                  // todo: folder-based, hierarchical??
                  metadata.push(new Metadata({ project: project, path: path.join(project.path, 'src', metadataType.directoryName, [child.fullName, metadataType.suffix].join('.')) }));
                });
              }
            } else {
              if (metadataType.inFolder) {
                console.log(typePackageSubscription);
                _.each(typePackageSubscription, function(sub) {
                  console.log('subscription member -->');
                  console.log(sub);
                  if (path.extname(sub)) {
                    console.log('creating metadata by path: '+path.join(project.path, 'src', metadataType.directoryName, sub));
                    metadata.push(new Metadata({ project: project, path: path.join(project.path, 'src', metadataType.directoryName, sub) }));
                  } else {
                    console.log('creating metadata by path: '+path.join(project.path, 'src', metadataType.directoryName, [sub, '-meta.xml'].join('')));
                    metadata.push(new Metadata({ project: project, path: path.join(project.path, 'src', metadataType.directoryName, [sub, '-meta.xml'].join('')) }));
                  }
                });
              } else {
                _.each(typePackageSubscription, function(sub) {
                  metadata.push(new Metadata({ project: project, path: path.join(project.path, 'src', metadataType.directoryName, [sub, metadataType.suffix].join('.')) }));
                });
              }
            }
          } else {
            metadata.push(new Metadata({ project: project, path: p }));
          }
        });
        return resolve(metadata);
      })
      .catch(function(err) {
        reject(new Error('Could not get metadata from paths: '+err.message));
      });
  });
};

module.exports.Metadata = Metadata;
module.exports.MetadataService = MetadataService;