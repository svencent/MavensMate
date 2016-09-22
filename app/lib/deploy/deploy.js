var Package = require('../package');
var path = require('path');
var fs = require('fs-extra-promise');
var temp = require('temp');
var _ = require('lodash');
var logger = require('winston');
var util = require('../util');

function Deploy(project, documents, targets) {
  this._project = project;
  this._documents = documents;
  this._targets = targets;
}

Deploy.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.stage()
      .then(function(zipStream) {
        return self._project.sfdcClient.deploy(zipStream, { rollbackOnError : true, performRetrieve: true });
      })
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Deployments via metadata api require a local directory structure with a package.xml
 * @return {[type]} [description]
 */
Deploy.prototype.stage = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var tmpPath = temp.mkdirSync({ prefix: 'mm_' });
      var unpackagedPath = path.join(tmpPath, 'unpackaged');
      fs.mkdirpSync(unpackagedPath);

      var packageXml = new Package();
      packageXml.initializeFromDocuments(self._documents);
      packageXml.writeToDisk(unpackagedPath);

      _.each(self._documents, function(d) {
        var tmpDocumentPath = path.join(tmpPath, d.getServerProperties().fileName);
        fs.ensureDirSync(path.dirname(tmpDocumentPath));
        fs.copySync(d.getPath(), tmpDocumentPath);
        if (d.getDescribe().metaFile) {
          fs.copySync([d.getPath(),'-meta.xml'].join(''), [tmpDocumentPath,'-meta.xml'].join(''));
        }
      });

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

module.exports = Deploy;