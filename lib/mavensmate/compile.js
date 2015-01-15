'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var config            = require('./config');
var LightningService  = require('./lightning');
var MetadataHelper    = require('./metadata').MetadataHelper;
var Deploy            = require('./deploy');
var fs                = require('fs-extra');
var util              = require('./util').instance;

var CompileDelegate = function(project, paths) {
  if (!project || !paths) {
    throw new Error('DeleteDelegate requires a valid project instance and an array of paths to delete.');
  }
  this.project = project;
  this.paths = paths;
  this.metadataHelper = new MetadataHelper({ sfdcClient : this.project.sfdcClient });
};

/**
 * Executes local and server compile for all delegate paths
 * @return {Promise}
 */
CompileDelegate.prototype.execute = function() {
  // TODO: implement stash
  var self = this;
  return new Promise(function(resolve, reject) {
    var directoriesToCompile = [];
    var filesToCompile = [];
    _.each(self.paths, function(p) {
      if (!fs.existsSync(p)) {
        return reject(new Error('Invalid compile request. Path does not exist: '+p));
      }

      var isDirectory = fs.lstatSync(p).isDirectory();
      var isFile = fs.lstatSync(p).isFile();

      if (isDirectory) {
        directoriesToCompile.push(p);
      } else if (isFile) {
        filesToCompile.push(p);
      } else {
        return reject(new Error('Invalid compile request. Invalid path: '+p));
      }
    });

    var compilePromises = [ 
      self._compileDirectories(directoriesToCompile), 
      self._compileFiles(filesToCompile)
    ];

    //self._compileFiles(filesToCompile)
    Promise.all(compilePromises)
      .then(function(compileResults) {
        resolve(self._flattenResults(compileResults));
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(new Error('Could not complete compile request: '+err.message));
      });
  });  
};

CompileDelegate.prototype._flattenResults = function(compileResults) {
  var results = [];
  _.each(compileResults, function(result) {
    if (_.isArray(result)) {
      _.each(result, function(r) {
        if (r) {
          results = _.union(results, r);       
        }
      });
    }
  });
  logger.debug('compile results: ');
  logger.debug(JSON.stringify(results));
  return results;
};

CompileDelegate.prototype._compileDirectories = function(directories) {
  // [ 
  //    path/to/project/src/classes,
  //    path/to/project/src/objects
  // ]
  // the responsibility here is to determine the project's subscription and set up a retrieve and overwrite
  
  var self = this;
  return new Promise(function(resolve, reject) {
    if (directories.length === 0) {
      return resolve([]);
    }

    self.metadataHelper.getMetadataFromPaths(directories, self.project)
      .then(function(metadataToCompile) {
        var lightningMetadataToCompile = [];
        var genericMetadataToCompile = [];

        _.each(metadataToCompile, function(m) {
          if (m.isLightningType()) {
            lightningMetadataToCompile.push(m);
          } else {
            genericMetadataToCompile.push(m);
          }
        });

        var compilePromises = [ 
          self._compileGenericMetadata(genericMetadataToCompile), 
          self._compileLightningMetadata(lightningMetadataToCompile)
        ];

        return Promise.all(compilePromises);
      })
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(new Error('Could not complete compile request: '+err.message));
      });
  });
};

CompileDelegate.prototype._compileFiles = function(filePaths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (filePaths.length === 0) {
      return resolve([]);
    }

    logger.debug('compiling file paths: ');
    logger.debug(filePaths);

    self.metadataHelper.getMetadataFromPaths(filePaths, self.project)
      .then(function(metadataToCompile) {
        var lightningMetadataToCompile = [];
        var genericMetadataToCompile = [];

        _.each(metadataToCompile, function(m) {
          if (m.isLightningType()) {
            lightningMetadataToCompile.push(m);
          } else {
            genericMetadataToCompile.push(m);
          }
        });

        var compilePromises = [ 
          self._compileGenericMetadata(genericMetadataToCompile), 
          self._compileLightningMetadata(lightningMetadataToCompile)
        ];

        return Promise.all(compilePromises);
      })
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(new Error('Could not complete delete request: '+err.message));
      });

  });
};

/**
 * Compiles metadata, will use metadata API or tooling API based on the metadata payload requested
 * @param  {Array} type Metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
CompileDelegate.prototype._compileGenericMetadata = function(metadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // we separate lightning from metadata here because we don't technically compile lightning components
    // ensures all files are actually part of this project
    _.each(metadata, function(m) {
      if (m.path.indexOf(self.project.path) === -1) {
        throw new Error('Referenced file is not a part of this project: '+m.path);
      }
    });

    var shouldCompileWithToolingApi = config.get('mm_compile_with_tooling_api');
    var canCompileWithToolingApi = true;
    if (shouldCompileWithToolingApi) {
      _.each(metadata, function(m) {
        if (!m.isToolingType() || m.isMetaFile()) {
          canCompileWithToolingApi = false;
          return false;
        }
      });
    }

    logger.debug('compiling generic metadata: ');
    util.logMetadata(logger, metadata);
    
    if (shouldCompileWithToolingApi && canCompileWithToolingApi) {
      // here we compile via the tooling api
      logger.debug('compiling via tooling api');
      self.project.sfdcClient.compileWithToolingApi(metadata, self.project)
        .then(function(result) {
          logger.debug('compile via tooling api result: ');
          logger.debug(result);
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    } else {
      // here we compile via a metadata api deployment
      logger.debug('compiling via metadata api');
      var deploy = new Deploy({ project: self.project });
      deploy.compileWithMetadataApi(metadata)
        .then(function(result) {
          logger.debug('compile via metadata api result: ');
          logger.debug(result);
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    }
  });
};

/**
 * Compiles metadata, will use metadata API or tooling API based on the metadata payload requested
 * @param  {Array} type Metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
CompileDelegate.prototype._compileLightningMetadata = function(metadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var lightningService = new LightningService(self.project);
    lightningService.update(metadata)
      .then(function(result) {   
        logger.debug('compile lightning result: ');
        logger.debug(result);
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

module.exports = CompileDelegate;