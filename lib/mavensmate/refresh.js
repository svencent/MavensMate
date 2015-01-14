'use strict';

var fs                = require('fs-extra');
var path              = require('path');
var Promise           = require('bluebird');
var _                 = require('lodash');
var logger            = require('winston');
var MetadataService   = require('./metadata').MetadataService;
var LightningService  = require('./lightning');
var Package           = require('./package');
var util              = require('./util').instance;
var find              = require('findit');
// var config            = require('./config');
// var Deploy            = require('./deploy');

var RefreshDelegate = function(project) {
  this.project = project;
};

/**
 * Refreshes local copies of Metadata from the server
 * @param  {Array} metadata
 * @return {Promise} 
 */
RefreshDelegate.prototype.refreshFromServer = function(metadata) {
  // TODO: implement stash
  var self = this;

  return new Promise(function(resolve, reject) {
    // we separate lightning from metadata here because we don't technically compile lightning components
    var lightningMetadata = [];
    var otherMetadata = [];

    // ensures all files are actually part of this project
    _.each(metadata, function(m) {
      if (m.path.indexOf(self.project.path) === -1) {
        throw new Error('Referenced file is not a part of this project: '+m.path);
      }
      if (m.isLightningType()) { // bundles can be refreshed via metadata api
        lightningMetadata.push(m);
      } else {
        otherMetadata.push(m);
      }
    });

    if (lightningMetadata.length > 0 && otherMetadata.length > 0) {
      reject(new Error('MavensMate does not currently support refreshing lightning components with other types of metadata'));
      return;
    }

    logger.debug('refreshing from server');
    // logger.debug(metadata);

    if (lightningMetadata.length > 0) {
      logger.debug('refreshing lightning components');
      logger.debug(lightningMetadata[0].path);

      var lightningService = new LightningService(self.project);
      lightningService.getBundleItems(lightningMetadata)
        .then(function(result) {   
          console.log('result from getting bundle items: ');
          console.log(result);
          resolve(result);
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    } else {      
      // here we refresh via the metadata api (using a package.xml)

      // TODO: refactor, as this pattern is used several places
      var unpackagedPath = path.join(self.project.workspace, self.project.name, 'unpackaged');
      if (fs.existsSync(unpackagedPath)) {
        fs.removeSync(unpackagedPath);
      }

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
          var finder = find(path.join(self.project.path, 'unpackaged'));
          finder.on('file', function (file) { 
            var fileBasename = path.basename(file);
            if (fileBasename !== 'package.xml') {
              // file => /foo/bar/myproject/unpackaged/classes/myclass.cls

              var directory = path.dirname(file); //=> /foo/bar/myproject/unpackaged/classes
              var destinationDirectory = directory.replace(path.join(self.project.workspace, self.project.name, 'unpackaged'), path.join(self.project.workspace, self.project.name, 'src')); //=> /foo/bar/myproject/src/classes

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
            var unpackagedPath = path.join(self.project.workspace, self.project.name, 'unpackaged');
            if (fs.existsSync(unpackagedPath)) {
              fs.removeSync(unpackagedPath);
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
      }
  });
};

module.exports = RefreshDelegate;