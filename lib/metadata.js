'use strict';
var jsforce   = require('jsforce');
var Q         = require('q');
var tmp       = require('tmp');
var _         = require('lodash');
var up        = require('underscore-plus');
var swig      = require('swig');
var fs        = require('fs-extra');
var unzip     = require('unzip');
var path      = require('path');
var util      = require('./util').instance;
var uuid      = require('node-uuid');
var SalesforceClient  = require('../lib/sfdc-client');
var xmldoc = require('xmldoc');
var archiver = require('archiver');


// {
//   "params": {
//     "api_name": "MyApexClass"
//   },
//   "metadata_type": "ApexClass",
//   "github_template": {
//     "name": "Default",
//     "description": "The default template for an Apex Class",
//     "author": "MavensMate",
//     "file_name": "ApexClass.cls",
//     "params": [
//       {
//         "name": "api_name",
//         "description": "Apex Class API Name",
//         "default": "MyApexClass"
//       }
//     ]
//   }
// }

/**
 * Represents an element of Salesforce.com metadata
 *
 * @param {Object} [opts] - Options
 * @param {String} [opts.metadataType] - type of metadata (ApexClass|ApexTrigger|ApexPage|etc.)
 * @param {String} [opts.githubTemplate] - template
 * @param {String} [opts.params] - template params
 */
function Metadata(opts) {
  util.applyProperties(this, opts);
  this.metadataType = util.getMetadataTypeByName(this.metadataType);
  swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
}

Metadata.prototype._writePackage = function(path) {
  var deferred = Q.defer();
  var file = path.join(path, 'package.xml');
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

Metadata.prototype._writeBody = function(path) {
  var deferred = Q.defer();
  var self = this;
  // TODO: create and populate metadata file based on supplied template and params
  var file = path.join(path, 'src', self.metadataType.directoryName, [self.params.apiName,self.metadataType.suffix].join('.'));
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

module.exports = Metadata;
