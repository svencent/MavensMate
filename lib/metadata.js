'use strict';
var Q         = require('q');
var _         = require('lodash');
var tmp       = require('tmp');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;

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
  }
  swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
}

/**
 * Constructor for Metadata that does not yet exist in Salesforce
 * @returns {null}
 */
Metadata.prototype._initializeNew = function() {
  this._type = Metadata.getTypeByPath(this.metadataType);
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

Metadata.prototype._writeBody = function(path) {
  var deferred = Q.defer();
  var self = this;
  // TODO: create and populate metadata file based on supplied template and params
  var file = path.join(path, 'src', self._type.directoryName, [self.params.apiName,self._type.suffix].join('.'));
  var fileBody = swig.renderFile('package.xml', {
    obj: this
  });
  fs.outputFile(file, fileBody, function(err) {
    if (err) {
      deferred.reject(new Error(err));  
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

/**
 * creates requested metadata, writes to disk
 *
 * @method SalesforceClient#_deleteContainer
 * @param {String} containerId - Id of metadatacontainer
 */
Metadata.prototype.deploy = function() {
  var deferred = Q.defer();
  var self = this;

  var tmpPath;

  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(new Error(err));
    }

    tmpPath = newPath;
    self._writePackage(tmpPath)
      .then(function() {
        return self._writeBody(tmpPath);
      })
      .then(function() {
        util.zipDirectory(path.join(newPath, 'unpackaged'), newPath)
          .then(function() {
            process.chdir(self.path);
            var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
            return global.sfdcClient.deploy(zipStream, { rollbackOnError : true });
          })
          .then(function(result) {
            global.logger.debug('Compile result: ', result);
            deferred.resolve(result);
          })
          ['catch'](function(error) {
            deferred.reject(new Error(error));
          })
          .done();           
      });
  });

  return deferred.promise;
};

/**
 * Takes an array of file paths, generates Metadata instances for each
 * @param  {Array} files
 * @return {Array of Metadata}
 */
Metadata.classify = function(files) {
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

module.exports = Metadata;