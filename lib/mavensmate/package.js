'use strict';

var Q       = require('q');
var _       = require('lodash');
var swig    = require('swig');
var fs      = require('fs-extra');
var path    = require('path');
var util    = require('./util').instance;
var logger  = require('winston');
var config  = require('./config');
var xmldoc  = require('xmldoc');
var sax     = require('sax');

/**
 * Represents a deployment to one or more Salesforce.com servers
 * @param {Object} opts
 * @param {String} opts.location - Location of package.xml
 * @param {Array} opts.metadata - Array of metadata
 */
function PackageService(opts) {
  util.applyProperties(this, opts);
  swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.join(__dirname,'templates')) });
}

/**
 * Inserts metadata to package.xml
 * @param  {Array of type Metadata} metadata
 * @return {[type]}
 */
PackageService.prototype.insert = function(metadata, writeToDisk) {
  var deferred = Q.defer();
  var self = this;

  logger.debug('inserting metadata to package service');
  logger.debug(metadata.toString());

  if (!_.isArray(metadata)) {
    metadata = [metadata];
  }

  this.deserialize()
    .then(function(pkg) {
      logger.debug('package deserialized');
      logger.debug(pkg);

      _.each(metadata, function(m) {
        logger.debug('metadata type: ');
        logger.debug(m.getType());
        var metadataTypeXmlName = m.getType().xmlName;
        if (_.has(pkg, metadataTypeXmlName)) {
          if (pkg[metadataTypeXmlName] === '*') {
            return false; // nothing to do here
          } else {
            if (pkg[metadataTypeXmlName].indexOf(m.getName()) === -1) {
              pkg[metadataTypeXmlName].push(m.getName());
            }
          }
        } else {
          pkg[metadataTypeXmlName] = [m.getName()];
        }
      });

      logger.debug('pkg after:');
      logger.debug(pkg);

      if (writeToDisk) {
        self.serialize(pkg, true);
      }

      deferred.resolve(pkg);
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not insert metadata to package: '+err.message));
    })
    .done();

  return deferred.promise;
};

/**
 * Removes metadata from package.xml
 * @param  {Array of type Metadata} metadata
 * @return {[type]}
 */
PackageService.prototype.remove = function(metadata, writeToDisk) {
  var deferred = Q.defer();
  var self = this;

  logger.debug('removing metadata via package service');
  logger.debug(metadata.toString());

  if (!_.isArray(metadata)) {
    metadata = [metadata];
  }

  this.deserialize()
    .then(function(pkg) {
      logger.debug('package deserialized');
      logger.debug(pkg);

      _.each(metadata, function(m) {
        logger.debug(m.getName());
        logger.debug('metadata type: ');
        logger.debug(m.getType());
        var metadataTypeXmlName = m.getType().xmlName;
        if (_.has(pkg, metadataTypeXmlName)) {
          if (pkg[metadataTypeXmlName] === '*') {
            return false; // nothing to do here
          } else {
            var members = pkg[metadataTypeXmlName];
            var newMembers = [];
            _.each(members, function(member) {
              if (member !== m.getName()) {
                newMembers.push(member);
              }
            });
            pkg[metadataTypeXmlName] = newMembers;
          }
        } else {
          pkg[metadataTypeXmlName] = m.getName();
        }
      });

      logger.debug('pkg after:');
      logger.debug(pkg);

      if (writeToDisk) {
        self.serialize(pkg, true);
      }

      deferred.resolve(pkg);
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not insert metadata to package: '+err.message));
    })
    .done();

  return deferred.promise;  
};

/**
 * Takes an array of metadata, generates JavaScript object
 * @param  {Array} Metadata
 * @return {Object} -> { ApexClass:'*', ApexPage:['apage', 'anotherpage'] }, etc.
 */
PackageService.prototype.objectify = function() {
  var pkgObject = {};
  var self = this;

  if (!_.isArray(self.metadata)) {
    self.metadata = [self.metadata];
  }

  _.each(self.metadata, function(m) {
    var metadataTypeXmlName = m.getType().xmlName;
    if (!_.has(pkgObject, metadataTypeXmlName)) {
      pkgObject[metadataTypeXmlName] = [m.getName()];
    } else {
      var value = pkgObject[metadataTypeXmlName];
      value.push(m.getName());
    }
  });

  return pkgObject;
};

/** 
 * Take JS object representation of package.xml, serializes to XML
 * @param  {Object} packageXmlObject
 * @return {String}
 */
PackageService.prototype.serialize = function(pkg, writeToDisk) {
  logger.debug('serializing package:');
  logger.debug(pkg);

  var serialized = swig.renderFile('package.xml', {
    obj: pkg,
    apiVersion: config.get('mm_api_version')
  });
  if (writeToDisk) {
    logger.debug(this.location);
    logger.debug(serialized);
    fs.writeFileSync(this.location, serialized);
  }
  return serialized;
};

/**
 * Parses package.xml to JS object
 * @param {String} location - disk location of package.xml
 * @return {Promise} - resolves to JavaScript object
 */
PackageService.prototype.deserialize = function() {
  var deferred = Q.defer();
  var pkg = {};
  var self = this;
  logger.debug('deserializing: '+this.location);
  if (!this.location) {
    deferred.reject(new Error('Please set package.xml location'));
  } else {
    fs.readFile(self.location, function(err, data) {
      if (err) {
        deferred.reject(err);
      } else {
        try {
          var parser = sax.parser(true);
          var isValidPackage = true;
          parser.onerror = function (e) {
            logger.debug('Parse error: package.xml --> '+e);
            isValidPackage = false;
            parser.resume();
          };
          parser.onend = function () {
            if (!isValidPackage) {
              deferred.reject(new Error('Could not parse package.xml'));
            } else {
              var doc = new xmldoc.XmlDocument(data);
              _.each(doc.children, function(type) {
                var metadataType;
                var val = [];

                if (type.name !== 'types') {
                  return;
                }
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
              deferred.resolve(pkg);
            }
          };
          parser.write(data.toString().trim()).close();
        } catch(e) {
          deferred.reject('Could not deserialize package: '+e.message);
        }
        
      }
    });
  }

  return deferred.promise;
};

module.exports = PackageService;