var Promise = require('bluebird');
var Package = require('../package');
var path    = require('path');
var fs      = require('fs-extra-promise');
var temp    = require('temp');
var _       = require('lodash');
var logger  = require('winston');
var util    = require('../util');

function Destructive(project, documents) {
  this._project = project;
  this._documents = documents;
}

Destructive.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.stage()
      .then(function(zipStream) {
        var deployOptions = {
          purgeOnDelete: self._project.config.get('mm_purge_on_delete'),
          rollbackOnError: true,
          checkOnly: true // todo: testing only
        };
        return self._project.sfdcClient.deploy(zipStream, deployOptions);
      })
      .then(function(result) {
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      });
  });
};

/**
 * Deletes via metadata api require a local directory structure with an empty package.xml and destructiveChanges.xml
 * @return {Promise} [description]
 */
Destructive.prototype.stage = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var tmpPath = temp.mkdirSync({ prefix: 'mm_' });
      var unpackagedPath = path.join(tmpPath, 'unpackaged');
      fs.mkdirpSync(unpackagedPath);

      var destructivePackageXml = new Package();
      destructivePackageXml.initializeFromDocuments(self._documents);
      destructivePackageXml.writeToDisk(unpackagedPath, 'destructiveChanges.xml');

      var emptyPkgXml = new Package();
      emptyPkgXml.initializeFromDocuments({});
      emptyPkgXml.writeToDisk(unpackagedPath);

      util.zipDirectory(unpackagedPath, tmpPath)
        .then(function(res) {
          var zipStream = fs.createReadStream(path.join(tmpPath, 'unpackaged.zip'));
          resolve(zipStream);
        })
        .catch(function(err) {
          throw err;
        });
    } catch(err) {
      reject(err);
    }
  });
};

module.exports = Destructive;