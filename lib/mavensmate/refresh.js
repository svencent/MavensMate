'use strict';

var fs                = require('fs-extra');
var path              = require('path');
var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var MetadataHelper    = require('./metadata').MetadataHelper;
var LightningService  = require('./lightning');
var Package           = require('./package');
var util              = require('./util').instance;
var find              = require('findit');
var temp              = require('temp');

/**
 * Responsible for refreshing local copies of files/directories from the server
 * @param {Project} project - project instance (required)
 */
var RefreshDelegate = function(project, paths) {
  if (!project || !paths) {
    throw new Error('RefreshDelegate requires a valid project instance and an array of paths to refresh.');
  }
  this.project = project;
  this.paths = paths;
  this.metadataHelper = new MetadataHelper({ sfdcClient : this.project.sfdcClient });
};

/**
 * Executes refresh and overwrite for all delegate paths
 * @return {Promise}
 * TODO: handle src
 */
RefreshDelegate.prototype.execute = function() {
  // TODO: implement stash
  var self = this;
  return new Promise(function(resolve, reject) {
    var directoriesToRefresh = [];
    var filesToRefresh = [];
    _.each(self.paths, function(p) {
      if (!fs.existsSync(p)) {
        // TODO: what about situations where the user has deleted the path locally???
        return reject(new Error('Invalid refresh request. Path does not exist: '+p));
      }

      var isDirectory = fs.lstatSync(p).isDirectory();
      var isFile = fs.lstatSync(p).isFile();

      if (isDirectory) {
        directoriesToRefresh.push(p);
      } else if (isFile) {
        filesToRefresh.push(p);
      } else {
        return reject(new Error('Invalid refresh request. Invalid path: '+p));
      }
    });

    var refreshPromises = [ 
      self._refreshDirectories(directoriesToRefresh), 
      self._refreshFiles(filesToRefresh)
    ];

    Promise.all(refreshPromises)
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(new Error('Could not complete refresh request: '+err.message));
      });
  });  
};

RefreshDelegate.prototype._refreshDirectories = function(directories) {
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
      .then(function(metadataToRefresh) {
        var lightningMetadataToRefresh = [];
        var genericMetadataToRefresh = [];

        _.each(metadataToRefresh, function(m) {
          if (m.isLightningType()) {
            lightningMetadataToRefresh.push(m);
          } else {
            genericMetadataToRefresh.push(m);
          }
        });

        var refreshPromises = [ 
          self._retrieveAndOverwriteGenericMetadata(genericMetadataToRefresh), 
          self._retrieveAndOverwriteLightningMetadata(lightningMetadataToRefresh)
        ];

        return Promise.all(refreshPromises);
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(new Error('Could not complete refresh request: '+err.message));
      });
  });
};

RefreshDelegate.prototype._refreshFiles = function(filePaths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (filePaths.length === 0) {
      return resolve();
    }

    self.metadataHelper.getMetadataFromPaths(filePaths, self.project)
      .then(function(metadataToRefresh) {
        var lightningMetadataToRefresh = [];
        var genericMetadataToRefresh = [];

        _.each(metadataToRefresh, function(m) {
          if (m.isLightningType()) {
            lightningMetadataToRefresh.push(m);
          } else {
            genericMetadataToRefresh.push(m);
          }
        });

        var refreshPromises = [ 
          self._retrieveAndOverwriteGenericMetadata(genericMetadataToRefresh), 
          self._retrieveAndOverwriteLightningMetadata(lightningMetadataToRefresh)
        ];

        return Promise.all(refreshPromises);
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        // TODO: revert via stash
        reject(new Error('Could not complete refresh request: '+err.message));
      });
  });
};

/**
 * Retrieves source of lightning bundle items, overwrite local copies
 * @param  {Array} lightningMetadata - array of Metadata of type Lightning
 * @return {Promise}
 * TODO: overwrite local copies
 */
RefreshDelegate.prototype._retrieveAndOverwriteLightningMetadata = function(lightningMetadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('refreshing lightning components');
    logger.debug(lightningMetadata[0].path);

    var lightningService = new LightningService(self.project);
    lightningService.getBundleItems(lightningMetadata)
      .then(function(result) {   
        console.log('result from getting bundle items: ');
        console.log(result);
        resolve(result);
        // todo : overwrite
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
RefreshDelegate.prototype._retrieveAndOverwriteGenericMetadata = function(metadata) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var newPath = temp.mkdirSync({ prefix: 'mm_' });
    var retrievePath = path.join(newPath, 'unpackaged');

    var fileProperties;
    var retrieveResultStream;
    var pkg = new Package({ metadata: metadata });
    pkg.init()
      .then(function() {
        logger.debug('submitting retrieve request for pkg metadata');
        return self.project.sfdcClient.retrieveUnpackaged(pkg.subscription);
      })
      .then(function(retrieveResult) {
        retrieveResultStream = retrieveResult.zipStream;
        fileProperties = retrieveResult.fileProperties;
        return util.writeStream(retrieveResultStream, self.project.path);
      })
      .then(function() {
        return self.project.updateLocalStore(fileProperties);
      })
      .then(function() {
        // TODO: handle packaged
        var finder = find(retrievePath);
        finder.on('file', function (file) { 
          var fileBasename = path.basename(file);
          if (fileBasename !== 'package.xml') {
            // file => /foo/bar/myproject/unpackaged/classes/myclass.cls

            var directory = path.dirname(file); //=> /foo/bar/myproject/unpackaged/classes
            var destinationDirectory = directory.replace(retrievePath, path.join(self.project.workspace, self.project.name, 'src')); //=> /foo/bar/myproject/src/classes

            // make directory if it doesnt exist (parent dirs included)
            if (!fs.existsSync(destinationDirectory)) {
              fs.mkdirpSync(destinationDirectory); 
            }

            // remove project metadata, replace with recently retrieved
            fs.removeSync(path.join(destinationDirectory, fileBasename));
            fs.copySync(file, path.join(destinationDirectory, fileBasename));
          }
        });
        finder.on('end', function () {
          // remove retrieved
          // TODO: package support
          if (fs.existsSync(retrievePath)) {
            fs.removeSync(retrievePath);
          }
          resolve();
        });
        finder.on('error', function (err) {
          reject(new Error('Could not process retrieved metadata: '+err.message));
        });
      })
      .catch(function(err) {
        // console.log(err.stack);
        reject(new Error('Could not refresh metadata: '+err.message));
      })
      .done();
    });
};

module.exports = RefreshDelegate;