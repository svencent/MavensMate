'use strict';
var Q         = require('q');
var _         = require('lodash');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
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
 * @param {Object} [opts.sfdcClient] - sfdc-client instance (optional)
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
  if (this.project === undefined) {
    throw new Error('You must provide a valid project instance');
  }
  this.metadataService = new MetadataService({ sfdcClient : this.project.sfdcClient });
  this._type = this.metadataService.getTypeByName(this.metadataType); // todo: project not always defined
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
  this.metadataService = new MetadataService({ sfdcClient : this.project.sfdcClient });
  this._type = this.metadataService.getTypeByPath(this.path);
  this._basename = path.basename(this.path);
  this._name = this._basename.split('.')[0];
  this._ext = this.path.split('.').pop();
  try {
    this._id = this.project.getLocalStore()[this._basename].id;
  } catch(e){}
};

Metadata.prototype.isMetaFile = function() {
  return util.endsWith(this.getPath(), '-meta.xml');
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
Metadata.prototype.writeFile = function(deployPath) {
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
        var metaFileBody = swig.renderFile('meta.xml', { 
          metadata: self,
          apiVersion: config.get('mm_api_version')
        });
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

Metadata.prototype.deleteLocally = function() {
  if (this.hasMetaFile()) {
    fs.remove(this.getPath()+'-meta.xml');
  }
  fs.remove(this.getPath());
};

function MetadataService(opts) {
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
}

/**
 * Takes an array of metadata, generates JavaScript object
 * @param  {Array} Metadata
 * @return {Object} -> { ApexClass:'*', ApexPage:['apage', 'anotherpage'] }, etc.
 */
MetadataService.prototype.objectify = function(metadata) {
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

MetadataService.prototype.getTypeByPath = function(p) {
  var ext;
  if (util.endsWith(p, '-meta.xml')) {
    ext = p.replace('-meta.xml', '').split('.').pop();
  } else {
    ext = p.split('.').pop();
  }
  return this.getTypeBySuffix(ext); 
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
    }
];

module.exports.Metadata = Metadata;
module.exports.MetadataService = MetadataService;
