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
 Example payload: 
{
  "params": {
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
 * Represents an element of Salesforce.com metadata
 * @constructor
 * @param {Object} [opts] - Options
 * @param {Object} [opts.project] - project instance (optional)
 * @param {String} [opts.path] - file path
 * @param {String} [opts.metadataTypeXmlName] - xml name for type of metadata (ApexClass|ApexTrigger|ApexPage|etc.)
 * @param {String} [opts.template] - template
 * @param {String} [opts.params] - template params
 */
Metadata = function(opts) {
  util.applyProperties(this, opts);
  if (this.project === undefined) {
    throw new Error('You must provide a valid project instance');
  }
  this.metadataService = new MetadataService({ sfdcClient : this.project.sfdcClient });
  if (this.template !== undefined && this.metadataTypeXmlName !== undefined) {
    this._initializeNew();
  } else if (this.path !== undefined && fs.existsSync(this.path)) {
    this._initializeExisting();
  } else if (this.path !== undefined) {
    throw new Error('Could not locate '+this.path);
  } else {
    this._initializeNew();
  }
  swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
};

/**
 * Constructor for Metadata that does not yet exist in Salesforce
 * @returns {null}
 */
Metadata.prototype._initializeNew = function() {
  this.type = this.metadataService.getTypeByName(this.metadataTypeXmlName); 
  /*jshint camelcase: false */
  if (this.params) {
    this.name = this.params.api_name; // TODO: standardize formats
  } else if (this.apiName) {
    this.name = this.apiName;
  } else {
    throw new Error('Could not initialize new metadata, no api name could be determined');
  }
};

/**
 * Constructor for Metadata that exists in Salesforce
 * @return {null}
 */
Metadata.prototype._initializeExisting = function() {
  this.type = this.metadataService.getTypeByPath(this.path);
  this.basename = path.basename(this.path);
  this.name = this.basename.split('.')[0]; 
  this.extension = path.extname(this.path).replace(/./, '');
  if (!this.extension) {
    throw new Error('Unable to determine metadata extension');
  }
  logger.debug('existing metadata: '+this.extension+', '+this.name+', '+this.basename);
  if (this.isLightningType() && this.getLightningDefinitionType !== 'BUNDLE') {
    // todo 
  } else {
    try {
      this.id = this.project.getLocalStore()[this.basename].id;
    } catch(e){
      logger.debug('Could not get metadata id: '+e.message);
    }
  }
};

var _id;
var _body;
var _path;
var _type;
var _basename;
var _name;
var _extension;

/**
 * Metadata body (source code, conents, etc.)
 */
Object.defineProperty(Metadata.prototype, 'body', {
  get: function() {
    if (!_body && this.path) {
      _body = util.getFileBody(this.path);
    }
    return _body;
  },
  set: function(value) {
    _body = value;
  }
});

/**
 * Path of the metadata (e.g. /project/src/classes/foo.cls)
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'path', {
  get: function() {
    return _path;
  },
  set: function(value) {
    _path = value;
  }
});

/**
 * Type of the metadata (e.g. ApexClass)
 * @return {Object}
 */
Object.defineProperty(Metadata.prototype, 'type', {
  get: function() {
    return _type;
  },
  set: function(value) {
    _type = value;
  }
});

/**
 * Id of the metadata
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'id', {
  get: function() {
    return _id;
  },
  set: function(value) {
    _id = value;
  }
});

/**
 * Id of the metadata
 * @return {String}
 */
Object.defineProperty(Metadata.prototype, 'basename', {
  get: function() {
    return _basename;
  },
  set: function(value) {
    _basename = value;
  }
});

/**
 * Name of the metadata. For new (non-server) Metadata, this is the desired name (e.g. MyApexClass)
 * @return {String}
 */
 Object.defineProperty(Metadata.prototype, 'name', {
   get: function() {
     return _name;
   },
   set: function(value) {
     _name = value;
   }
 });

/**
* Returns the name of the metadata. For new (non-server) Metadata, this is the desired name (e.g. MyApexClass)
* @return {String}
*/
Object.defineProperty(Metadata.prototype, 'extension', {
  get: function() {
    return _extension;
  },
  set: function(value) {
    _extension = value;
  }
});

// /**
//  * Get metadata type
//  * @return {Object}
//  */
// Metadata.prototype.getType = function() {
//   return this._type;
// };

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
        var fileBody = swig.render(templateBody, { locals: self.params });
        fs.outputFileSync(filePath, fileBody);

        if (self.hasMetaFile()) {
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
      this.setPath(path.join(this.project.path, 'src', this.type.directoryName));
    } else {
      if (this.type.inFolder) {
        // to do
      } else if (this.isLightningType() && this.getLightningDefinitionType() !== 'BUNDLE') {
        fs.outputFileSync(path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.')), body);
        this.setPath(path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.')));
      } else {
        fs.outputFileSync(path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.')), body);
        this.setPath(path.join(this.project.path, 'src', this.type.directoryName, [this.name, this.extension].join('.')));
      }
    }
  } else {
    throw new Error('Could not write to disk. No valid path or project could be found.');
  }
};

/**
 * Returns path of the metadata (existing metadata only) (e.g. /project/src/classes/foo.cls)
 * @return {String}
 */
Metadata.prototype.setPath = function(p) {
  this.path = p;
};

/**
 * Returns whether this metadata type requires a corresponding meta file
 * @return {String}
 */
Metadata.prototype.hasMetaFile = function() {
  return this.type.metaFile === true;
};

Metadata.prototype.deleteFromLocalFileSystem = function() {
  if (this.hasMetaFile()) {
    fs.remove(this.path+'-meta.xml');
  }
  fs.remove(this.path);
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
 * Takes an array of metadata, generates JavaScript object
 * @param  {Array} Metadata
 * @return {Object} -> { ApexClass:'*', ApexPage:['apage', 'anotherpage'] }, etc.
 */
MetadataService.prototype.objectify = function(metadata) {
  return new Promise(function(resolve, reject) {
    try {
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
      return resolve(pkg);
    } catch(err) {
      reject(new Error('Could not objectify metadata: '+err.message));
    }
  });
};

/**
 * Gets the metadata type by the file's path
 * @param  {String} p - location of the file
 * @return {Object}   Metadata type definition
 * TODO: handle folder-based and hierarchical types like Reports, Dashboards, and Objects
 * TODO: handle directories
 * TODO: handle those that dont exist on the file system! does it matter?!
 */
MetadataService.prototype.getTypeByPath = function(p) {
  var parentPath = path.dirname(p);
  var grandparentPath = path.dirname(path.dirname(p));
  var existsOnFileSystem = fs.existsSync(p);
  if (existsOnFileSystem && path.basename(grandparentPath) === 'aura') {
    return this.getTypeByDirectoryName('aura');
  } else {    
    var folderBasedTypes = _.where(this.parentTypes, { 'inFolder': true });

    // directory handling
    if (existsOnFileSystem && fs.lstatSync(p).isDirectory()) {
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
  }
};

/**
 * Gets metadata type based on the supplied name
 * @param  {String} name - ApexClass|ApexPage|etc.
 * @return {Object}
 */
MetadataService.prototype.getTypeByName = function(name) {
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
 * Takes an array of file paths, generates Metadata instances for each (was Metadata.classify)
 * @param  {Array} files
 * @return {Array of Metadata}
 */
MetadataService.prototype.getMetadataFromPaths = function(paths, project) {
  // TODO: handle directories, too!
  // TODO: handle folder-based metadata, like documents, templates
  // TODO: handle deeply-nested types like CustomObject/CustomField
  var metadata = [];
  _.each(paths, function(p) {
    metadata.push(new Metadata({ project: project, path: p }));
  });
  return metadata;
};

module.exports.Metadata = Metadata;
module.exports.MetadataService = MetadataService;