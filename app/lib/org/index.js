/**
 * @file Responsible for locally indexing Salesforce metadata (Custom Objects, Apex Classes, Lightning files, etc.)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var _               = require('lodash');
var Promise         = require('bluebird');
var temp            = require('temp');
var config          = require('../../config');
var path            = require('path');
var util            = require('../util');
var find            = require('findit');
var logger          = require('winston');
var parseXml        = require('xml2js').parseString;
var MetadataHelper  = require('../metadata').MetadataHelper;
var Package         = require('../package');
var MavensMateFile  = require('../file').MavensMateFile;
var Document        = require('../document').Document;
var childTypes      = require('./helpers/child-types');

/**
 * Service to get an index of an org's metadata
 * @param {SalesforceClient} sfdcClient - client instance
 * @param {Array} metadataTypes - array of xml name for metadata types to index [ "ApexClass", "ApexComponent", etc ]
 */
function Indexer(sfdcClient, metadataTypes) {
  this.sfdcClient = sfdcClient;
  this.metadataTypes = metadataTypes;
  this.typeMap = {};
}

Indexer.prototype.listMetadataForTypes = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var listMetadataPromises = [];

      _.each(self.metadataTypes, function(metadataTypeXmlName) {
        logger.debug('adding type to map ', metadataTypeXmlName); // "ApexClass"

        // todo: convenience method
        var metadataDescribe = _.find(self.sfdcClient.describe.metadataObjects, function(d) {
          return metadataTypeXmlName === d.xmlName;
        });

        if (!metadataDescribe) {
          throw new Error('Unknown metadata type: '+metadataTypeXmlName); // todo: warn instead?
        }

        self.typeMap[metadataTypeXmlName] = metadataDescribe; // typeMap["ApexClass"] = { some stuff about this type }

        var listMetadataName; // name to submit to list query
        if (self.typeMap[metadataTypeXmlName].inFolder) {
          listMetadataName = self._transformFolderNameForListRequest(metadataTypeXmlName);
        } else {
          listMetadataName = metadataTypeXmlName;
        }

        // TODO: reimplement list providers
        // if (_.has(pkg, metadataTypeXmlName+'ListProvider')) {
        //   var listProvider = new pkg[metadataTypeXmlName+'ListProvider'](self.sfdcClient);
        //   listMetadataPromises.push(listProvider.getList());
        // } else {
        //   listMetadataPromises.push(self.sfdcClient.list(listMetadataName));
        // }
        listMetadataPromises.push(self.sfdcClient.list(listMetadataName));
      });

      Promise.all(listMetadataPromises)
        .then(function(listMetadataResponses) {
          resolve(listMetadataResponses);
        })
        .catch(function() {
          reject(err);
        });
    } catch(e) {
      reject(e);
    }
  });
};

/**
 * Indexes Salesforce.com org based on project metadataTypes
 * @return {Promise}
 */
Indexer.prototype.index = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('indexing metadataTypes', self.metadataTypes);
    self.listMetadataForTypes()
      .then(function(listMetadataResponses) {
        var indexTypePromises = [];
        _.each(listMetadataResponses, function(listMetadataResponse) {
          indexTypePromises.push(self._indexType(listMetadataResponse));
        });
        return Promise.all(indexTypePromises);
      })
      .then(function(results) {
        resolve(results);
      })
      .catch(function(error) {
        logger.error('An error occurred indexing server properties');
        logger.error(error.message);
        logger.error(error.stack);
        reject(error);
      });
  });
};

/**
 *
 * Builds a 4-level hierarchy index for the specified type
 * @param  {Object} typeListResult
 * @return {Promise}
 */
Indexer.prototype._indexType = function(typeListResult) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // typeListResult will be an object with an xmlName key, array of results
    // { "ApexClass" : [ { "fullName" : "MyApexClass" }, { "fullName" : "MyOtherApexClass" } ] }

    logger.debug('indexing type', typeListResult);

    var parentNode = {};
    var childNames = [];
    var parentHasChildTypes;
    var parentIsFolderType;
    var xmlName;

    // process the type returned (ApexClass, ApexPage, CustomObject, etc.)
    _.forOwn(typeListResult, function(children, key) {
      if (util.endsWith(key,'Folder')) {
        key = self._transformFolderNameToBaseName(key);
      }

      xmlName = key;
      parentHasChildTypes = _.has(self.typeMap[key], 'childXmlNames');
      parentIsFolderType = self.typeMap[key].inFolder;

      // children (2)
      _.each(children, function(childNode) {
        childNode.id = childNode.id;
        childNode.clientId = [key, childNode.fullName].join('.');
        childNode.title = childNode.fullName;
        childNode.text = childNode.fullName;
        childNode.level = 2;
        childNode.fullName = childNode.fullName || new MavensMateFile({ path : childNode.fileName }).name; // todo: MavensMateFile??
        childNode.leaf = (parentHasChildTypes || parentIsFolderType) ? false : true;
        childNode.checked = false;
        childNode.cls = (parentHasChildTypes || parentIsFolderType) ? 'folder' : '';
        childNode.isFolder = parentHasChildTypes || parentIsFolderType;
        childNode.children = [];
        childNode.select = false;
        if (parentHasChildTypes) {
          childNames.push(childNode.fullName);
        }
      });
      children = _.sortBy(children, 'title'); // for dynatree display purposes

      // top level (1)
      parentNode.id = key;
      parentNode.clientId = key;
      parentNode.title = key;
      parentNode.xmlName = key;
      parentNode.text = key;
      parentNode.key = key; // dynatree property
      parentNode.level = 1; // dynatree property
      parentNode.type = self.typeMap[key];
      parentNode.isFolder = true; // dynatree property
      parentNode.inFolder = parentIsFolderType; // e.g. EmailTemplate, Dashboard, Document
      parentNode.cls = 'folder'; // dynatree property
      parentNode.select = false; // dynatree property
      parentNode.expanded = false; // dynatree property
      parentNode.hasChildTypes = parentHasChildTypes; // e.g. CustomObject
      parentNode.children = children;
    });

    /*
      we need to retrieve child metadata, crawl the result and insert levels 3 and 4 of metadata
      examples of metadata types with child types: CustomObject or Workflow
      examples of metadata types with folders: Document or Dashboard (folders go 1-level deep currently)
     */
    var indexPromise;
    if (parentHasChildTypes) {
      indexPromise = self._indexChildren(parentNode, xmlName, childNames);
    } else if (parentIsFolderType) {
      indexPromise = self._indexFolders(parentNode, xmlName);
    }

    if (indexPromise) {
      indexPromise
        .then(function(result) {
          resolve(result);
        })
        .catch(function(err) {
          logger.error('Could not index children/folders for '+xmlName, err);
          reject(err);
        });
    } else {
      resolve(parentNode);
    }
  });
};

/**
 * Indexes children Metadata by preparing and submitting retrieve requests
 * @param  {Object} parentNode
 * @param  {String} xmlName
 * @param  {Array} childNames
 * @return {Promise}
 */
Indexer.prototype._indexChildren = function(parentNode, xmlName, childNames) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var childRetrievePackage = {};
      if (childNames && childNames.length > 0) {
        childRetrievePackage[xmlName] = childNames;
      }

      logger.debug('child retrieve package', childRetrievePackage);

      var tmpPath = temp.mkdirSync({ prefix: 'mm_' });
      self.sfdcClient.retrieveUnpackaged(childRetrievePackage, true, tmpPath)
        .then(function() {
          var finder = find(path.join(tmpPath, 'unpackaged', self.typeMap[xmlName].directoryName));
          finder.on('file', function (file) {

            var fileBasename = path.basename(file);
            var fileBasenameNoExtension = fileBasename.split('.')[0];
            var fileBody = util.getFileBodySync(file);

            var indexedChildType = _.find(parentNode.children, { 'clientId': [xmlName,fileBasenameNoExtension].join('.') });

            logger.debug('indexedChildType -->', indexedChildType);

            parseXml(fileBody, function(err, xmlObject) {

              _.forOwn(xmlObject[xmlName], function(value, tagName) {

                // we're tracking this child type, now we need to add as a level 3 child
                // var matchingChildType = _.find(self.metadataHelper.childTypes, { 'tagName': tagName }); // todo: reimplement
                var matchingChildType = _.find(childTypes, { tagName: tagName });
                if (matchingChildType) {

                  var leaves = [];
                  //now add level leaves (lowest level is 4 at the moment)
                  if (!_.isArray(value)) {
                    value = [value];
                  }
                  _.each(value, function(item) {
                    var key;
                    if (item.fullName) {
                      key = item.fullName[0];
                    } else if (item.actionName) {
                      key = item.actionName[0];
                    } else {
                      logger.warn('Unrecognized child metadata type ', matchingChildType, item);
                    }
                    if (key) {
                      leaves.push({
                        leaf: true,
                        checked: false,
                        level: 4,
                        text: key,
                        title: key,
                        isFolder: false,
                        id: [xmlName, fileBasenameNoExtension, tagName, key].join('.'),
                        select: false
                      });
                    }
                  });

                  if ( !_.find(indexedChildType, { 'text' : tagName }) ) {
                    indexedChildType.children.push({
                      checked: false,
                      level: 3,
                      id: [xmlName, fileBasenameNoExtension, tagName].join('.'),
                      text: tagName,
                      title: tagName,
                      isFolder: true,
                      children: leaves,
                      select: false,
                      cls: 'folder'
                    });
                  }
                }
              });
            });
          });
          finder.on('end', function () {
            resolve(parentNode);
          });
          finder.on('error', function (err) {
            logger.error('Could not crawl retrieved metadata: '+err.message);
            reject(err);
          });
        })
        .catch(function(err) {
          logger.error('Could not index metadata type '+xmlName+': ' +err.message);
          logger.error(err.stack);
          reject(err);
        });
    } catch(err) {
      logger.error('Could not index metadata type '+xmlName+': ' +err.message);
      reject(err);
    }
  });
};

/**
 * Indexes folder-based Metadata by preparing and submitting folder-based retrieve requests
 * @param  {Object} parentXmlType
 * @param  {String} xmlName
 * @return {Promise}
 */
Indexer.prototype._indexFolders = function(parentNode, xmlName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var listFolderPromises = [];
    _.each(parentNode.children, function(folder) {
      listFolderPromises.push(self.sfdcClient.listFolder(xmlName, folder.fullName));
    });

    Promise.all(listFolderPromises)
      .then(function(results) {
        _.each(results, function(r) {

          var folderName = Object.keys(r)[0];
          var folderNode = _.find(parentNode.children, { text: folderName });
          var folderContents = r[folderName];

          _.each(folderContents, function(item) {
            folderNode.children.push({
              id: item.id,
              clientId: [xmlName, item.fullName.split('/')[0], item.fullName.split('/')[1]].join('.'),
              text: item.fullName.split('/')[1],
              title: item.fullName.split('/')[1],
              leaf: true,
              checked: false,
              level: 3, // dynatree property
              isFolder: false, // dynatree property
              select: false // dynatree property
            });
          });
        });
        resolve(parentNode);
      })
      .catch(function(error) {
        logger.error('Could not finish indexing server properties', error);
        reject(error);
      });
  });
};

/**
 * The Salesforce.com metadata api can be wonky, this transforms a folder type name to a list-friendly name
 * @param  {String} typeName
 * @return {String}
 */
Indexer.prototype._transformFolderNameForListRequest = function(typeName) {
  var metadataRequestType = typeName+'Folder';
  if (metadataRequestType === 'EmailTemplateFolder') {
    metadataRequestType = 'EmailFolder'; // ugh.
  }
  return metadataRequestType;
};

/**
 * More gynastics to get xml type names to be consistent
 * @param  {String} typeName - xml type name
 * @return {String}
 */
Indexer.prototype._transformFolderNameToBaseName = function(typeName) {
  if (typeName === 'EmailFolder') {
    return 'EmailTemplate';
  } else {
    return typeName.replace('Folder', '');
  }
};

module.exports = Indexer;
