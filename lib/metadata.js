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
  this._type = Metadata.getTypeByName(this.metadataType);
  /*jshint camelcase: false */
  this._name = this.params.api_name; // TODO: standardize formats
};

/**
 * Constructor for Metadata that exists in Salesforce
 * @return {null}
 */
Metadata.prototype._initializeExisting = function() {
  if (global.project === undefined) {
    throw new Error('Before initializing existing metadata, you must setup a Project instance');
  }
  this._type = Metadata.getTypeByPath(this.path);
  this._basename = path.basename(this.path);
  this._name = this._basename.split('.')[0];
  this._ext = this.path.split('.').pop();
  this._id = global.project.localStore[this._basename].id;
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
  var templateSource = global.config.get('mm_template_source');
  if (templateSource === undefined || templateSource === '') {
    templateSource = 'joeferraro/MavensMate-Templates/master';
  }
  var templateLocation = global.config.get('mm_template_location');
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
 * Deploys instance to server, creating a server copy, places in global.project
 * @return {Promise} - resolves with Object response from Salesforce
 */
Metadata.prototype.deployToServer = function() {
  var deferred = Q.defer();
  var self = this;

  var tmpPath;
  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(err);
    } else {
      tmpPath = newPath;
      var metadataObject = Metadata.objectify(self);
      Metadata.writePackage(metadataObject, path.join(tmpPath, 'unpackaged'))
        .then(function() {
          return self._writeFile(tmpPath);
        })
        .then(function() {
          return util.zipDirectory(path.join(newPath, 'unpackaged'), newPath);
        })
        .then(function() {
          process.chdir(global.project.path);
          var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
          return global.sfdcClient.deploy(zipStream, { rollbackOnError : true });
        })
        .then(function(result) {
          global.logger.debug('New metadata creation result: '+ JSON.stringify(result));
          if (result.success) {
            var metadataPath = path.join(newPath, 'unpackaged', self.getType().directoryName, self.getName()+'.'+self.getType().suffix);
            // metadataPath => /my/tmp/directory/unpackaged/classes/myclass.cls

            var fileBasename = path.basename(metadataPath);
            // fileBaseName => myclass.cls

            var directory = path.dirname(metadataPath); 
            // directory => /my/tmp/directory/unpackaged/classes
            
            var projectSrc = path.join(global.project.workspace, global.project.projectName, 'src');
            // projectSrc => /foo/bar/myproject/src

            var destinationDirectory = directory.replace(path.join(newPath, 'unpackaged'), projectSrc); 
            // destinationDirectory => /foo/bar/myproject/src/classes

            // make directory if it doesnt exist (parent dirs included)
            if (!fs.existsSync(destinationDirectory)) {
              fs.mkdirpSync(destinationDirectory); 
            }

            // copy to project
            fs.copySync(metadataPath, path.join(destinationDirectory, fileBasename));

            if (self.hasMetaFile()) {
              fs.copySync(metadataPath+'-meta.xml', path.join(destinationDirectory, fileBasename+'-meta.xml'));
            }  
          }
          deferred.resolve(result);
        })
        ['catch'](function(error) {
          console.log(error);
          global.logger.debug('Error deploying new metadata to server');
          global.logger.debug(error);
          deferred.reject(new Error('Could not deploy metadata to server: '+error));
        })
        .done();           
    }
  });

  return deferred.promise;
};

/**
 * Takes an array of file paths, generates Metadata instances for each
 * @param  {Array} files
 * @return {Array of Metadata}
 */
Metadata.classify = function(files) {
  // TODO: handle directories, too!
  // TODO: handle folder-based metadata, like documents, templates
  // TODO: handle deeply-nested types like CustomObject/CustomField
  var metadata = [];
  _.each(files, function(f) {
    metadata.push(new Metadata({ path: f }));
  });
  return metadata;
};

/**
 * Gets metadata type based on the supplied path
 * @param  {String} path
 * @return {Object}
 */
Metadata.getTypeByPath = function(path) {
  var ext = path.split('.').pop();
  return Metadata.getTypeBySuffix(ext);
};

/**
 * Gets metadata type based on the supplied name
 * @param  {String} name - ApexClass|ApexPage|etc.
 * @return {Object}
 */
Metadata.getTypeByName = function(name) {
  var type;
  _.each(global.describe.metadataObjects, function(metadataType) {
    if (metadataType.xmlName === name) {
      type = metadataType;
      return false;
    }
  });
  return type;
};

/**
 * Gets metadata type based on the supplied suffix
 * @param  {String} suffix - cls|trigger|page|component|etc.
 * @return {Object}
 */
Metadata.getTypeBySuffix = function(suffix) {
  var type;
  if (suffix.indexOf('.') >= 0) {
    suffix = suffix.replace(/\./g, '');
  }
  _.each(global.describe.metadataObjects, function(metadataType) {
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
Metadata.getTypeByDirectoryName = function(dirName) {
  var type;
  _.each(global.describe.metadataObjects, function(metadataType) {
    if (metadataType.directoryName === dirName) {
      type = metadataType;
      return false;
    }
  });
  return type;
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

/**
 * Writes a file in package.xml format based on specified metadata object
 * @param  {Object} objectifiedMetadata
 * @param  {String} destination
 * @param  {String} fileName - leave blank for 'package.xml', specify 'destructiveChanges.xml' for deletion deploy
 * @return {Promise}
 */
Metadata.writePackage = function(objectifiedMetadata, destination, fileName) {
  var deferred = Q.defer();
  if (fileName === undefined) {
    fileName = 'package.xml';
  }
  var file = path.join(destination, fileName);
  var fileBody = swig.renderFile('package.xml', {
    obj: objectifiedMetadata
  });
  fs.outputFile(file, fileBody, function(err) {
    if (err) {
      deferred.reject(err);  
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

/**
 * Takes an array of Metadata instances and prepares a local deployment zip to be passed to the Metadata API for deletion
 * @param  {Array} of type Metadata - metadata
 * @return {Promise} resolves with zip stream
 */
Metadata.prepareDelete = function(metadata) {
  var deferred = Q.defer();

  // TODO: handle folder-based metadata, like documents, templates
  // recurse upward looking for valid folder name, if reach path.join(workspace, projectname), then not valid?

  // writes temp directory, puts zip file inside
  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(err);
    } else {
      fs.mkdirpSync(path.join(newPath, 'unpackaged'));

      var metadataObject = Metadata.objectify(metadata);

      Metadata.writePackage(metadataObject, path.join(newPath, 'unpackaged'), 'destructiveChanges.xml')
        .then(function() {
          return util.zipDirectory(path.join(newPath, 'unpackaged'), newPath);
        })
        .then(function() {
          var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
          deferred.resolve(zipStream);  
        })
        ['catch'](function(err) {
          deferred.reject(new Error('Could not prepare metadata for deletion: '+err));
        })
        .done();
    }
  });
  return deferred.promise;
};

/**
 * Deletes metadata locally (from a project) 
 * @param  {Array} of type Metadata - metadata
 * @return {Nothing}
 */
Metadata.deleteLocally = function(metadata) {
  _.each(metadata, function(m) {
    if (fs.existsSync(m.getPath())) {
      fs.removeSync(m.getPath());
    }
    if (m.hasMetaFile()) {
      if (fs.existsSync(m.getPath()+'-meta.xml')) {
        fs.removeSync(m.getPath()+'-meta.xml');
      }  
    }
  });
};

/**
 * Takes an array of Metadata instances and prepares a local deployment zip to be passed to the Metadata API for deployment
 * @param  {Array} of type Metadata - metadata
 * @return {Promise} resolves with zip stream
 */
Metadata.prepareDeployment = function(metadata) {
  var deferred = Q.defer();

  // TODO: handle folder-based metadata, like documents, templates
  // recurse upward looking for valid folder name, if reach path.join(workspace, projectname), then not valid?

  // writes temp directory, puts zip file inside
  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(err);
    } else {
      fs.mkdirpSync(path.join(newPath, 'unpackaged'));

      var metadataObject = Metadata.objectify(metadata);

      Metadata.writePackage(metadataObject, path.join(newPath, 'unpackaged'))
        .then(function() {
          _.each(metadata, function(m) {
            var metadataPath = m.getPath();
            // metadataPath => /foo/bar/myproject/unpackaged/classes/myclass.cls

            var fileBasename = path.basename(metadataPath);
            // fileBaseName => myclass.cls

            var directory = path.dirname(metadataPath); 
            // directory => /foo/bar/myproject/unpackaged/classes
            
            var projectSrc = path.join(global.project.workspace, global.project.projectName, 'src');
            var destinationDirectory = directory.replace(projectSrc, path.join(newPath, 'unpackaged')); 
            // destinationDirectory => /foo/bar/myproject/unpackaged/classes

            // make directory if it doesnt exist (parent dirs included)
            if (!fs.existsSync(destinationDirectory)) {
              fs.mkdirpSync(destinationDirectory); 
            }

            // copy to tmp
            fs.copySync(metadataPath, path.join(destinationDirectory, fileBasename));

            if (m.hasMetaFile()) {
              fs.copySync(metadataPath+'-meta.xml', path.join(destinationDirectory, fileBasename+'-meta.xml'));
            }
          }); 
          
          return util.zipDirectory(path.join(newPath, 'unpackaged'), newPath);
        })
        .then(function() {
          var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
          deferred.resolve(zipStream);  
        })
        ['catch'](function(err) {
          deferred.reject(new Error('Could not prepare metadata for deployment: '+err));
        })
        .done();
    }
  });

  return deferred.promise;
};

/**
 * The Salesforce.com metadata api can be wonky, this transforms a folder type name to a list-friendly name
 * @param  {String} typeName
 * @return {String}
 */
Metadata._transformFolderNameForListRequest = function(typeName) {
  var metadataRequestType = typeName+'Folder';
  if (metadataRequestType === 'EmailTemplateFolder') {
    metadataRequestType = 'EmailFolder';
  }
  return metadataRequestType;
};

Metadata._transformFolderNameToBaseName = function(typeName) {
  return typeName.replace('Folder', '');
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

/**
 * Indexes children Metadata by preparing and submitting retrieve requests
 * @param  {Object} indexedType
 * @param  {Object} typeMap
 * @param  {String} xmlName
 * @param  {Array} childNames
 * @return {Promise}
 */
Metadata._indexChildren = function(indexedType, typeMap, xmlName, childNames) {
  var deferred = Q.defer();

  try {
    var childRetrievePackage = {};
    childRetrievePackage[xmlName] = childNames;
    global.sfdcClient.retrieveUnpackaged(childRetrievePackage)
      .then(function(retrieveResult) {
        return util.writeStream(retrieveResult.zipStream, temp.mkdirSync({ prefix: 'mm_' }));
      })
      .then(function(retrievePath) {         
        var finder = find(path.join(retrievePath, 'unpackaged', typeMap[xmlName].directoryName));
        finder.on('file', function (file) { 
          
          var fileBasename = path.basename(file);
          var fileBasenameNoExtension = fileBasename.split('.')[0];
          var fileBody = util.getFileBody(file);

          var indexedChildType = _.find(indexedType.children, { 'id': [xmlName,fileBasenameNoExtension].join('.') });       
          // console.log(indexedChildType);

          parseXml(fileBody, function (err, xmlObject) {
            // console.log(xmlObject);

            _.forOwn(xmlObject[xmlName], function(value, tagName) {
              // console.log(tagName);

              // we're tracking this child type, now we need to add as a level 3 child
              var matchingChildType = _.find(Metadata.childTypes, { 'tagName': tagName });
              if (matchingChildType !== undefined) {
                
                var leaves = [];

                //now add level leaves (lowest level is 4 at the moment)
                if (!_.isArray(value)) {
                  value = [value];
                }
                _.each(value, function(item) {
                  leaves.push({
                    leaf: true,
                    checked: false,
                    level: 4,
                    text: item.fullName[0],
                    title: item.fullName[0],
                    isFolder: false,
                    id: [xmlName, fileBasenameNoExtension, tagName, item.fullName[0]].join('.'),
                    select: false
                  });
                });

                if (_.find(indexedChildType, { 'text' : tagName }) === undefined) {
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
          // todo: delete tmp directory?
          deferred.resolve(indexedType);
        });
        finder.on('error', function (err) {
          deferred.reject(new Error('Could not crawl retrieved metadata: '+err.message));
        });
      })
      ['catch'](function(err) {
        deferred.reject(new Error('Could not index metadata type '+xmlName+': ' +err.message));
      })
      .done();
  } catch(e) {
    deferred.reject('Could not index metadata type '+xmlName+': ' +e.message);
  }

  return deferred.promise;
};

/**
 * Indexes folder-based Metadata by preparing and submitting folder-based retrieve requests
 * @param  {Object} indexedType
 * @param  {Object} typeMap
 * @param  {String} xmlName
 * @return {Promise}
 */
Metadata._indexFolders = function(indexedType, typeMap, xmlName) {
  var deferred = Q.defer();

  var listFolderRequests = [];

  _.each(indexedType.children, function(folder) {
    listFolderRequests.push(global.sfdcClient.listFolder(xmlName, folder.fullName));
  });

  Q.all(listFolderRequests)
    .then(function(results) {  
      _.each(results, function(r) {

        var folderName = Object.keys(r)[0];
        var folderContents = r[folderName];
        
        var indexedFolder = _.find(indexedType.children, { 'text' : folderName });

        _.each(folderContents, function(item) {
          indexedFolder.children.push({
            leaf: true, 
            title: item.fullName.split('/')[1], 
            checked: false, 
            text: item.fullName.split('/')[1], 
            level: 3, 
            isFolder: false, 
            id: [item.fullName.split('/')[0], item.fullName.split('/')[1]].join('.'), 
            select: false
          });
        });

      });

      deferred.resolve(indexedType);
    })
    ['catch'](function(error) {
      deferred.reject(new Error('Could not finish indexing server properties: '+error.message));
    })
    .done();

  return deferred.promise;
};

/**
 * TODO: handle managed/unmanaged metadata
 * 
 * Builds a 4-level hierarchy index for the specified type
 * @param  {Object} typeListResult
 * @param  {Object} typeMap
 * @return {Promise}
 */
Metadata._indexType = function(typeListResult, typeMap) {
  var deferred = Q.defer();

  // typeListResult will be an object with an xmlName key, array of results
  // { "ApexClass" : [ { "fullName" : "MyApexClass" }, { "fullName" : "MyOtherApexClass" } ] } 

  var indexedType = {};
  var childNames = [];
  var hasChildTypes;
  var isFolderType;
  var xmlName;

  // process the type returned (ApexClass, ApexPage, CustomObject, etc.)
  _.forOwn(typeListResult, function(items, key) {

    if (key.endsWith('Folder')) {
      key = Metadata._transformFolderNameToBaseName(key);
    }

    xmlName = key;
    hasChildTypes = _.has(typeMap[key], 'childXmlNames');
    isFolderType = typeMap[key].inFolder;

    // top level (1)
    var metadataTypeDef = typeMap[key];
    indexedType.id = key;
    indexedType.type = metadataTypeDef;
    indexedType.title = key;
    indexedType.xmlName = key;
    indexedType.text = key;
    indexedType.key = key;
    indexedType.level = 1; //todo
    indexedType.hasChildTypes = hasChildTypes;
    indexedType.isFolder = true;
    indexedType.inFolder = isFolderType;
    indexedType.cls = 'folder';
    indexedType.select = false;
    indexedType.expanded = false;

    // children (2)
    _.each(items, function(item) {
      item.leaf = (hasChildTypes || isFolderType) ? false : true;
      item.title = item.fullName;
      item.checked = false;
      item.id = [key, item.fullName.replace(/\s/g,'')].join('.');
      item.text = item.fullName;
      item.cls = (hasChildTypes || isFolderType) ? 'folder' : '';
      item.level = 2;
      item.isFolder = hasChildTypes || isFolderType;
      item.children = [];
      item.select = false;

      if (hasChildTypes) {
        childNames.push(item.fullName);  
      }
    });

    indexedType.children = items;
  });

  var indexPromise;
  // we need to retrieve child metadata, crawl the result and insert levels 3 and 4 of metadata
  // examples of metadata types with child types: CustomObject or Workflow
  // examples of metadata types with folders: Document or Dashboard (folders go 1-level deep currently)
  if (hasChildTypes) {
    indexPromise = Metadata._indexChildren(indexedType, typeMap, xmlName, childNames);
  } else if (isFolderType) {
    indexPromise = Metadata._indexFolders(indexedType, typeMap, xmlName);
  }

  if (indexPromise !== undefined) {
    indexPromise
      .then(function(result) {
        deferred.resolve(result);
      })
      ['catch'](function(err) {
        deferred.reject(new Error('Could not index children/folders for '+xmlName+': '+err.message));
      })  
      .done();
  } else {
    deferred.resolve(indexedType);
  }

  return deferred.promise;
};

/**
 * Indexes Salesforce.com org (writes to .org_metadata) based on project subscription
 * @return {Promise}
 */
Metadata.indexServerProperties = function(metadataTypes) {
  var deferred = Q.defer();
  
  var typeMap = {};

  var listRequests = [];
  _.each(metadataTypes, function(type) {
    typeMap[type] = Metadata.getTypeByName(type);
    
    var typeRequestName; // name to submit to list query

    // prepare folder-based metadata for query
    var isFolderMetadata = typeMap[type].inFolder;
    if (isFolderMetadata) {
      typeRequestName = Metadata._transformFolderNameForListRequest(type);
    } else {
      typeRequestName = type;
    }

    // console.log('submitting list query for: '+typeRequestName);
    listRequests.push(global.sfdcClient.list(typeRequestName));
  });

  Q.all(listRequests)
    .then(function(results) {  
      var typePromises = [];
      _.each(results, function(metadataListResult) {
        typePromises.push(Metadata._indexType(metadataListResult, typeMap));
      });
      return Q.all(typePromises);
    })
    .then(function(results) {
      deferred.resolve(results);
    })
    ['catch'](function(error) {
      console.log(error);
      deferred.reject(new Error('Could not finish indexing server properties: '+error.message));
    })
    .done();
      
  return deferred.promise;
};

module.exports = Metadata;