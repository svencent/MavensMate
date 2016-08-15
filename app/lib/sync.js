/**
 * @file Responsible for compilation of Salesforce metadata (Custom Objects, Apex Classes, Lightning files, etc.)
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise           = require('bluebird');
var logger            = require('winston');
var temp              = require('temp');
var MetadataHelper    = require('./metadata').MetadataHelper;
var fs                = require('fs-extra');
var moment            = require('moment');
var mavensMateFile    = require('./file');

/**
 * Responsible for compiling local copies of files/directories
 * @param {Project} project - project instance (required)
 * @param {Array} paths - array of path strings [ 'foo/bar/src/classes', 'foo/bar/src/pages/foo.page' ]
 */
var SyncDelegate = function(project, path, force) {
  if (!project || !path) {
    throw new Error('SyncDelegate requires a valid project instance and a path path to sync.');
  }
  this.project = project;
  this.path = path;
  this.force = force;
  this.metadataHelper = new MetadataHelper({ sfdcClient : this.project.sfdcClient });
};

/**
 * Checks for conflict between local copy and server copy
 * @param  {Array} files - array of MavensMateFiles
 * @return {Promise}
 */
SyncDelegate.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      logger.debug('syncing with the sevrer');

      var mmFile = mavensMateFile.createFileInstances([self.path], self.project)[0];

      mmFile.serverCopy
        .then(function(serverCopyResult) {
          
          if (!mmFile.localStoreEntry) {
            return reject(new Error('No local index found for '+mmFile.name+'. This can happen if you fetch your project from a remote git repository. Please ensure your project subscription includes the metadata type: "'+mmFile.type.xmlName+'", then run the "Clean Project" command to update your local index of metadata.'))
            return false;
          }

          logger.debug('local copy:');
          logger.debug(mmFile.localStoreEntry);
          logger.debug('remote copy:');
          logger.debug(serverCopyResult);

          var localLastModified = moment(mmFile.localStoreEntry.lastModifiedDate);
          var remoteLastModified = moment(serverCopyResult.LastModifiedDate);

          if (remoteLastModified.isAfter(localLastModified)) {
            logger.debug('conflict detected between: ');
            logger.debug(mmFile.localStoreEntry);
            logger.debug(serverCopyResult);

            var tempFile = temp.openSync({ prefix: 'mm_', suffix: ' [SERVER COPY].'+self.metadataHelper.getTypeByXmlName(mmFile.localStoreEntry.type).suffix });
            fs.writeSync(tempFile.fd, serverCopyResult.Body);
            serverCopyResult.tempPath = tempFile.path;

            var result = {
              local: mmFile.localStoreEntry,
              remote: serverCopyResult
            };
            return resolve(result);
          } else {
            return resolve('Local metadata is in sync with server');
          }
        })
        .catch(function(err) {
          reject(err);
        });

    } catch(e) {
      logger.error('Could not sync with server: ');
      logger.error(e);
      reject(e);
    }
  });
};

module.exports = SyncDelegate;
