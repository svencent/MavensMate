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

      /*
        here we copy project documents to the tmp path for deployment
       */
      _.each(self._documents, function(d) {
        if (d.isMetaXmlFile()) {
          /*
            it's possible that a document is a meta-xml file (e.g., user has compiled a single meta-xml file)
            in those cases, we need to copy both the meta-xml and associated document to the deploy folder
           */
          var associatedDocument = d.getAssociatedDocument();
          var tmpAssociatedDocumentPath = path.join(tmpPath, associatedDocument.getLocalStoreProperties().fileName);
          fs.ensureDirSync(path.dirname(tmpAssociatedDocumentPath));
          fs.copySync(associatedDocument.getPath(), tmpAssociatedDocumentPath); // copy associated document to tmp path
          fs.copySync(d.getPath(), [tmpAssociatedDocumentPath,'-meta.xml'].join('')); // copy meta-xml file as well
        } else {
          var tmpDocumentPath = path.join(tmpPath, d.getLocalStoreProperties().fileName);
          fs.ensureDirSync(path.dirname(tmpDocumentPath));
          fs.copySync(d.getPath(), tmpDocumentPath);
          if (d.getDescribe().metaFile) {
            fs.copySync([d.getPath(),'-meta.xml'].join(''), [tmpDocumentPath,'-meta.xml'].join(''));
          }
        }
      });

      /*
        zip the directory up so that it can be submitted to the metadata api for deployment
       */
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