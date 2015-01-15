'use strict';

var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var LightningService  = require('./lightning');
var Deploy            = require('./deploy');
var fs                = require('fs-extra');
var util              = require('./util').instance;
var path              = require('path');
var MetadataHelper    = require('./metadata').MetadataHelper;

/**
 * Responsible for deleting server and local copies of files/directories 
 * @param {Project} project - project instance (required)
 */
var DeleteDelegate = function(project, paths) {
  if (!project || !paths) {
    throw new Error('DeleteDelegate requires a valid project instance and an array of paths to delete.');
  }
  this.project = project;
  this.paths = paths;
  this.metadataHelper = new MetadataHelper({ sfdcClient : this.project.sfdcClient });
};

/**
 * Executes local and server delete for all delegate paths
 * @return {Promise}
 */
DeleteDelegate.prototype.execute = function() {
  // TODO: implement stash
  var self = this;
  return new Promise(function(resolve, reject) {
    var directoriesToDelete = [];
    var filesToDelete = [];
    _.each(self.paths, function(p) {
      if (!fs.existsSync(p)) {
        return reject(new Error('Invalid delete request. Path does not exist: '+p));
      }

      var isDirectory = fs.lstatSync(p).isDirectory();
      var isFile = fs.lstatSync(p).isFile();

      if (isDirectory) {
        directoriesToDelete.push(p);
      } else if (isFile) {
        filesToDelete.push(p);
      } else {
        return reject(new Error('Invalid delete request. Invalid path: '+p));
      }
    });

    var deletePromises = [ 
      self._deleteDirectories(directoriesToDelete), 
      self._deleteFiles(filesToDelete)
    ];

    self._deleteFiles(filesToDelete)
    //Promise.all(deletePromises)
      .then(function(deleteResults) {
        logger.debug('deletePromises results: ');
        logger.debug(deleteResults);
        self._deleteEmptyProjectDirectories();
        resolve(self._flattenResults(deleteResults));
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(err);
      });
  });  
};

DeleteDelegate.prototype._flattenResults = function(deleteResults) {
  var results = [];
  _.each(deleteResults, function(result) {
    console.log('delete result: ');
    console.log(result);
    if (_.isArray(result)) {
      results = _.union(results, result);
    } else if (result) {
      results.push(result);  
    }
  });
  logger.debug('delete results: ');
  logger.debug(JSON.stringify(results));
  return results;
};

DeleteDelegate.prototype._deleteEmptyProjectDirectories = function() {
  var self = this;
  fs.readdirSync(path.join(self.project.path, 'src')).filter(function(res) {
    if (fs.statSync(path.join(self.project.path, 'src', res)).isDirectory()) {
      if (util.isDirectoryEmptySync(path.join(self.project.path, 'src', res))) {
        try {
          fs.removeSync(path.join(self.project.path, 'src', res));
        } catch(e) {
          logger.debug('Could not delete '+path.join(self.project.path, 'src', res)+': '+e.message);
        }
      }
    }
  });
};

DeleteDelegate.prototype._deleteDirectories = function(directories) {
  // [ 
  //    path/to/project/src/classes,
  //    path/to/project/src/objects
  // ]
  // the responsibility here is to determine the project's subscription and set up a retrieve and overwrite
  
  var self = this;
  return new Promise(function(resolve, reject) {
    if (directories.length === 0) {
      return resolve();
    }

    self.metadataHelper.getMetadataFromPaths(directories, self.project)
      .then(function(metadataToDelete) {
        var lightningMetadataToDelete = [];
        var genericMetadataToDelete = [];

        _.each(metadataToDelete, function(m) {
          if (m.isLightningType()) {
            lightningMetadataToDelete.push(m);
          } else {
            genericMetadataToDelete.push(m);
          }
        });

        var deletePromises = [ 
          self._deleteGenericMetadata(genericMetadataToDelete), 
          self._deleteLightningMetadata(lightningMetadataToDelete)
        ];

        return Promise.all(deletePromises);
      })
      .then(function(deleteResults) {
        resolve(deleteResults);
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(err);
      });
  });
};

DeleteDelegate.prototype._deleteFiles = function(filePaths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (filePaths.length === 0) {
      return resolve();
    }

    self.metadataHelper.getMetadataFromPaths(filePaths, self.project)
      .then(function(metadataToDelete) {
        var lightningMetadataToDelete = [];
        var genericMetadataToDelete = [];

        _.each(metadataToDelete, function(m) {
          if (m.isLightningType()) {
            lightningMetadataToDelete.push(m);
          } else {
            genericMetadataToDelete.push(m);
          }
        });

        var deletePromises = [ 
          self._deleteGenericMetadata(genericMetadataToDelete), 
          self._deleteLightningMetadata(lightningMetadataToDelete)
        ];

        return Promise.all(deletePromises);
      })
      .then(function(deleteResults) {
        resolve(deleteResults);
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(err);
      });
  });
};

/**
 * Retrieves source of lightning bundle items, overwrite local copies
 * @param  {Array} lightningMetadata - array of Metadata of type Lightning
 * @return {Promise}
 * TODO: overwrite local copies
 */
DeleteDelegate.prototype._deleteLightningMetadata = function(lightningMetadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (lightningMetadata.length === 0) {
      return resolve();
    }

    logger.debug('deleting lightning components');
    logger.debug(lightningMetadata[0].path);

    var lightningService = new LightningService(self.project);
    lightningService.deleteBundleItems(lightningMetadata)
      .then(function(result) {   
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

/**
 * Retrieves source of metadata via retrieve
 * @param  {Arrau} metadata - array of Metadata instances
 * @return {Promise}
 */
DeleteDelegate.prototype._deleteGenericMetadata = function(metadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var deploy = new Deploy({ project: self.project });
    deploy.stageDelete(metadata)
      .then(function(zipStream) {
        // logger.debug('PROJECT PATH: '+self.project.path);
        return deploy.executeStream(zipStream);
      })
      .then(function(result) {
        logger.debug('Deletion result: '+ JSON.stringify(result));
        if (result.success && result.status === 'Succeeded') {
          _.each(metadata, function(m) {
            m.deleteFromLocalFileSystem();
          });
        }
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();   
  });
};

module.exports = DeleteDelegate;