var Promise   = require('bluebird');
var _         = require('lodash');
var logger    = require('winston');
var util      = require('../util');

/**
 * Checks for conflict between local copy and server copy
 * @param  {Array} components - array of Document
 * @return {Promise}
 */
module.exports.check = function(project, documents, force) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (!project.config.get('mm_compile_check_conflicts') || force) {
        return resolve({ hasConflict: false });
      }

      logger.debug('checking for conflicts');

      var result = { hasConflict: false };
      var conflicts = {};

      var serverCopyPromises = [];
      _.each(documents, function(d) {
        var type = d.getLocalStoreProperties().type;
        if (type === 'AuraDefinitionBundle' || util.startsWith(type, 'Apex')) {
          serverCopyPromises.push( f.serverCopy );
        }
      });

      Promise.all(serverCopyPromises)
        .then(function(serverCopyResults) {
          _.each(components, function(c, i) {
            // logger.debug('local copy:');
            // logger.debug(f.localStoreEntry);
            // logger.debug('remote copy:');
            // logger.debug(serverCopyResults[i]);
            if (!f.localStoreEntry) {
              return reject(new Error('No local index found for '+f.name+'. This can happen if you fetch your project from a remote git repository. Please ensure your project subscription includes the metadata type: "'+f.type.xmlName+'", then run the "Clean Project" command to update your local index of metadata.'))
              return false;
            }

            var localLastModified = moment(f.localStoreEntry.lastModifiedDate);
            var remoteLastModified = moment(serverCopyResults[i].LastModifiedDate);

            if (remoteLastModified.isAfter(localLastModified)) {
              logger.debug('conflict detected between: ');
              logger.debug(f.localStoreEntry);
              logger.debug(serverCopyResults[i]);

              var tempFile = temp.openSync({ prefix: 'mm_', suffix: ' [SERVER COPY].'+self.metadataHelper.getTypeByXmlName(f.localStoreEntry.type).suffix });
              fs.writeSync(tempFile.fd, serverCopyResults[i].Body);
              serverCopyResults[i].tempPath = tempFile.path;

              conflicts[f.basename] = {
                local: f.localStoreEntry,
                remote: serverCopyResults[i]
              };
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