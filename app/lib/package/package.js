/**
 * @file Represents a package.xml file
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise     = require('bluebird');
var _           = require('lodash');
var swig        = require('swig');
var fs          = require('fs-extra');
var path        = require('path');
var logger      = require('winston');
var config      = require('../../config');
var xmldoc      = require('xmldoc');
var sax         = require('sax');
var exceptions  = require('./exceptions');
var util        = require('../util');
var packageUtil = require('./util');

function Package(project) {
  this.apiVersion = project ? project.config.get('mm_api_version') : config.get('mm_api_version');
  this.contents = {};
  this.path = null;
}

/**
 * Populates package from an array of components
 * @param  {Array} components
 * @return {void}
 */
Package.prototype.initializeFromDocuments = function(documents) {
  var self = this;
  _.each(documents, function(d) {
    if (d.isMetaXmlFile()) d = d.getAssociatedDocument(); // we ignore -meta.xml files when creating package.xml
    var type = d.getLocalStoreProperties().type;
    var name = d.getLocalStoreProperties().fullName;
    if (!_.has(self.contents, type)) {
      self.contents[type] = [name];
    } else {
      var value = self.contents[type];
      value.push(name);
    }
  });
};

/**
 * Populates package from an existing path on the disk
 * @param  {Array} components
 * @return {void}
 */
Package.prototype.initializeFromPath = function(packagePath) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._deserialize(packagePath)
      .then(function(pkg) {
        self.path = packagePath;
        self.contents = pkg;
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Refreshes package contents from the disk
 * TODO: should we watch the file instead and update project.packageXml accordingly?
 * @return {Promise} - resolves with void
 */
Package.prototype.refreshContentsFromDisk = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self._deserialize(self.path)
      .then(function(pkg) {
        self.contents = pkg;
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

Package.prototype.writeToDisk = function(location, fileName) {
  if (fileName === undefined) fileName = 'package.xml';
  fs.outputFileSync(path.join(location,fileName), this._serialize());
};

Package.prototype.save = function() {
  if (this.path) fs.outputFileSync(this.path, this._serialize());
};

/**
 * Take JS object representation of package.xml, serializes to XML
 * @param  {Object} packageXmlObject
 * @return {String}
 */
Package.prototype._serialize = function() {
  var serialized = swig.renderFile(path.join(__dirname, '..', 'create', 'templates', 'Other', 'package.xml'), {
    obj: this.contents,
    apiVersion: this.apiVersion
  });
  return serialized;
};


/**
 * Inserts metadata to package subscription
 * @param  {Array of type Metadata} metadata
 * @return {None}
 */
Package.prototype.add = function(documents) {
  var self = this;
  documents = util.ensureArrayType(documents);
  _.each(documents, function(d) {
    var metadataTypeXmlName = d.getType();
    var packageXmlName = packageUtil.getDocumentPackageXmlName(d);
    if (_.has(self.contents, metadataTypeXmlName)) {
      if (self.contents[metadataTypeXmlName] === '*') {
        return false; // nothing to do here
      } else {
        if (self.contents[metadataTypeXmlName].indexOf(packageXmlName) === -1) {
          self.contents[metadataTypeXmlName].push(packageXmlName);
        }
      }
    } else {
      self.contents[metadataTypeXmlName] = [packageXmlName];
    }
  });
};

/**
 * Removes metadata from package subscription
 * @param  {Array of type Metadata} metadata
 * @return {[type]}
 */
Package.prototype.remove = function(documents) {
  var self = this;
  documents = util.ensureArrayType(documents);
  _.each(documents, function(d) {
    var metadataTypeXmlName = d.getType();
    var packageXmlName = packageUtil.getDocumentPackageXmlName(d);
    if (_.has(self.contents, metadataTypeXmlName)) {
      if (self.contents[metadataTypeXmlName] === '*') {
        return false; // nothing to do here
      } else {
        var members = self.contents[metadataTypeXmlName];
        var newMembers = [];
        _.each(members, function(member) {
          if (member !== packageXmlName) {
            newMembers.push(member);
          }
        });
        self.contents[metadataTypeXmlName] = newMembers;
      }
    } else {
      self.contents[metadataTypeXmlName] = packageXmlName;
    }
  });
};

/**
 * Parses package.xml to JS object
 * @param {String} path - disk path of package.xml
 * @return {Promise} - resolves to JavaScript object
 */
Package.prototype._deserialize = function(packagePath) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(packagePath)) {
      return reject(new exceptions.PackageXmlDoesNotExist('Package XML does not exist.'));
    }
    var pkg = {};
    logger.debug('deserializing', packagePath);
    fs.readFile(packagePath, function(err, data) {
      if (err) return reject(err);
      try {
        var parser = sax.parser(true);
        var isValidPackage = true;

        parser.onerror = function(e) {
          logger.debug('Parse error: package.xml', e);
          isValidPackage = false;
          parser.resume();
        };

        parser.onend = function () {
          if (!isValidPackage) return reject(new exceptions.PackageXmlInvalidFormat('Package.xml contains invalid XML.'));

          var doc = new xmldoc.XmlDocument(data);

          _.each(doc.children, function(type) {
            var metadataType;
            var val = [];

            if (type.name !== 'types') return;

            _.each(type.children, function(node) {
              if (node.name === 'name' && node.val !== undefined) {
                metadataType = node.val;
                return false;
              }
            });

            _.each(type.children, function(node) {
              if (node.name === 'members') {
                if (node.val === '*') {
                  val = '*';
                  return false;
                } else {
                  val.push(node.val);
                }
              }
            });

            pkg[metadataType] = val;

          });

          logger.debug('parsed package.xml to -->'+JSON.stringify(pkg));
          resolve(pkg);
        };

        parser.write(data.toString().trim()).close();

      } catch(e) {
        reject('Could not deserialize package: '+e.message);
      }
    });
  });
};

module.exports = Package;