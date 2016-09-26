/**
 * @file Metadata helper classes
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var _               = require('lodash');
var fs              = require('fs-extra');
var path            = require('path');
var util            = require('./util');
var logger          = require('winston');

var MetadataHelper;


MetadataHelper = function(opts) {
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
MetadataHelper.prototype.getTypeByPath = function(p) {
  var parentPath = path.dirname(p);
  var grandparentPath = path.dirname(path.dirname(p));
  if (!path.extname(p) && path.basename(parentPath) === 'aura') {
    return this.getTypeByDirectoryName('aura');
  } else if (path.basename(grandparentPath) === 'aura') {
    return this.getTypeByDirectoryName('aura');
  } else {
    var folderBasedTypes = _.filter(this.parentTypes, { 'inFolder': true });

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
MetadataHelper.prototype.getTypeByXmlName = function(name) {
  var type;
  var self = this;
  type = _.find(self.describe.metadataObjects, function(metadataType) {
    return metadataType.xmlName === name;
  });
  if (!type) {
    type = _.find(self.childTypes, function(childType) {
      return childType.xmlName === name;
    });
  }
  if (!type) {
    type = _.find(self.parentTypes, function(parentType) {
      return parentType.xmlName === name;
    });
  }
  logger.silly('getting metadata type by name: '+name);
  logger.silly(type);
  return type;
};

/**
 * Gets metadata type based on the supplied suffix
 * @param  {String} suffix - cls|trigger|page|component|etc.
 * @return {Object}
 */
MetadataHelper.prototype.getTypeBySuffix = function(suffix) {
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
MetadataHelper.prototype.getTypeByDirectoryName = function(dirName) {
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

MetadataHelper.prototype.childTypes = [
    {'xmlName' : 'ActionOverride', 'tagName' : 'actionOverrides', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'CustomField', 'tagName' : 'fields', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'BusinessProcess', 'tagName' : 'businessProcesses', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'RecordType', 'tagName' : 'recordTypes', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'WebLink', 'tagName' : 'webLinks', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'ValidationRule', 'tagName' : 'validationRules', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'NamedFilter', 'tagName' : 'namedFilters', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'SharingReason', 'tagName' : 'sharingReasons', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'ListView', 'tagName' : 'listViews', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'FieldSet', 'tagName' : 'fieldSets', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'SharingRecalculation', 'tagName' : 'sharingRecalculations', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'CompactLayout', 'tagName' : 'compactLayouts', 'parentXmlName' : 'CustomObject' },
    {'xmlName' : 'CustomLabel', 'tagName' : 'customLabels', 'parentXmlName' : 'CustomLabels' },
    {'xmlName' : 'SharingCriteriaRule', 'tagName' : 'sharingCriteriaRules', 'parentXmlName' : 'SharingRules' },
    {'xmlName' : 'SharingOwnerRule', 'tagName' : 'sharingOwnerRules', 'parentXmlName' : 'SharingRules' },
    {'xmlName' : 'SharingTerritoryRule', 'tagName' : 'sharingTerritoryRules', 'parentXmlName' : 'SharingRules' },
    {'xmlName' : 'WorkflowAlert', 'tagName' : 'alerts', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowTask', 'tagName' : 'tasks', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowOutboundMessage', 'tagName' : 'outboundMessages', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowFieldUpdate', 'tagName' : 'fieldUpdates', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowRule', 'tagName' : 'rules', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowEmailRecipient', 'tagName' : 'emailRecipients', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowTimeTrigger', 'tagName' : 'timeTriggers', 'parentXmlName' : 'Workflow' },
    {'xmlName' : 'WorkflowActionReference', 'tagName' : 'actionReferences', 'parentXmlName' : 'Workflow' }
];

MetadataHelper.prototype.inFolderDirectoryNames = function() {
  var directoryNames = [];
  var self = this;
  var parentTypes = (self.describe.metadataObjects && self.describe.metadataObjects.length > 0) ? self.describe.metadataObjects : self.parentTypes;
  _.each(parentTypes, function(metadataType) {
    if (metadataType.inFolder) {
      directoryNames.push(metadataType.directoryName);
    }
  });
  return directoryNames;
};

module.exports.MetadataHelper = MetadataHelper;