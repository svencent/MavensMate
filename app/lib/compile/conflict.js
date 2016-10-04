var Promise             = require('bluebird');
var _                   = require('lodash');
var temp                = require('temp');
var fs                  = require('fs-extra-promise');
var logger              = require('winston');
var util                = require('../util');
var moment              = require('moment');
var ApexDocument        = require('../document/apex');
var LightningDocument   = require('../document/lightning');

var _getMissingLocalStoreError = function(document) {
  var msg = 'No local index found for '+d.getName()+'.';
  msg += 'This can happen if you fetch your project from a remote git repository.';
  msg += 'Please ensure your project subscription includes the metadata type: '+d.getType()+', ';
  msg += 'then run the "Clean Project" command to update your local index of metadata.';
  return new Error(msg);
};

/**
 * Checks for conflict between local copy and server copy
 * @param  {Array} components - array of Document
 * @return {Promise}
 */
module.exports.check = function(project, documents, force) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {

      // we skip conflict checking if the user has opted out or if this is being
      // compiles with the "force" flag
      if (!project.config.get('mm_compile_check_conflicts') || force) {
        return resolve({ hasConflict: false });
      }

      logger.debug('checking for conflicts');

      var result = { hasConflict: false };
      var conflicts = {};

      var lightningDocuments = [];
      var apexDocuments = [];
      _.each(documents, function(d) {
        if (d instanceof ApexDocument) {
          apexDocuments.push(d);
        } else if (d instanceof LightningDocument && d.isLightningBundleItem()) {
          lightningDocuments.push(d);
        }
      });

      var serverCopyPromises = [];
      if (apexDocuments.length > 0) {
        serverCopyPromises.push(project.sfdcClient.getApexServerProperties(apexDocuments, true));
      }
      if (lightningDocuments.length > 0) {
        serverCopyPromises.push(project.sfdcClient.getLightningServerProperties(lightningDocuments, true));
      }

      Promise.all(serverCopyPromises)
        .then(function(serverCopyResults) {

          serverCopyResults = _.flatten(serverCopyResults);

          _.each(serverCopyResults, function(serverCopyResult) {
            var matchingDocument = _.find(documents, function(d) {
              return d.getLocalStoreProperties().id === serverCopyResult.Id;
            });

            if (matchingDocument) {
              var localStoreEntry = matchingDocument.getLocalStoreProperties();
              var localLastModified = moment(localStoreEntry.lastModifiedDate);
              var remoteLastModified = moment(serverCopyResult.LastModifiedDate);

              if (remoteLastModified.isAfter(localLastModified)) {
                logger.debug('conflict detected between: ');
                logger.debug(localStoreEntry);
                logger.debug(serverCopyResult);

                var tempFile = temp.openSync({
                  prefix: 'mm_',
                  suffix: ' [SERVER COPY].'+matchingDocument.getExtension()
                });

                fs.writeSync(tempFile.fd, serverCopyResult.Body);
                serverCopyResult.tempPath = tempFile.path;

                conflicts[matchingDocument.getBaseName()] = {
                  local: localStoreEntry,
                  remote: serverCopyResult
                };
              }
            } else {
              logger.warn('Unable to match document with server copy result', serverCopyResult);
            }
          });

          if (Object.keys(conflicts).length > 0) {
            result.hasConflict = true;
            result.success = false;
            result.conflicts = conflicts;
          }

          logger.debug('conflict check result:');
          logger.debug(result);

          return resolve(result);
        })
        .catch(function(err) {
          logger.error('error checking conflicts', err);
          reject(err);
        });
    } catch(e) {
      logger.error('Could not check conflicts: ');
      logger.error(e);
      reject(e);
    }
  });
};