'use strict';

var Promise = require('bluebird');
var _       = require('lodash');
var swig    = require('swig');
var fs      = require('fs-extra');
var path    = require('path');
var logger  = require('winston');
var config  = require('./config');
var xmldoc  = require('xmldoc');
var sax     = require('sax');

/**
 * Represents a collection of metadata
 * @param {Object} opts
 * @param {String} opts.path - path to package.xml
 * @param {Array} opts.metadata - Array of Metadata
 * @param {Array} opts.metadataTypeXmlNames - Array of metadata type xml names, e.g. ['ApexClass', 'ApexPage']
 */

// can take array of metadata as constructor argument, turns into object representation
// { "ApexClass" : [ "thisclass", "thatclass" ], "ApexPage" : "*" }

function Package(opts) {
  this.path = opts.path;
  this.files = opts.files;
  this.metadataTypeXmlNames = opts.metadataTypeXmlNames;
  this.subscription = opts.subscription;
  swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(__dirname) });
}

Package.prototype._path = null;
Package.prototype._files = null;
Package.prototype._subscription = null;

Package.prototype.init = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.subscription) {
      logger.debug('initing package instance with subscription: ');
      logger.debug(self.subscription);
      resolve();
    } else {
      logger.debug('initing package instance');
      if (self.files) {
        self._getSubscriptionFromFiles()
          .then(function(obj) {
            logger.debug('setting package subscription: ');
            logger.debug(obj);
            self.subscription = obj;
            resolve();
          })
          .catch(function(err) {
            reject(new Error('Could not initiate Package instance by metadata list: '+err.message));
          });
      } else if (self.metadataTypeXmlNames) {
        self._getSubscriptionFromMetadataTypeXmlNames()
          .then(function(obj) {
            logger.debug('setting package subscription: ');
            logger.debug(obj);
            self.subscription = obj;
            resolve();
          })
          .catch(function(err) {
            reject(new Error('Could not initiate Package instance by metadata list: '+err.message));
          });
      } else if (self.path) {
        self._deserialize()
          .then(function(obj) {
            logger.debug('setting package subscription: ');
            logger.debug(obj);
            self.subscription = obj;
            resolve();
          })
          .catch(function(err) {
            reject(new Error('Could not initiate Package instance by path: '+err.message));
          });
      }
    }
  });
};

/**
 *  Unstructured array of Metadata elements included in this package
 */
Object.defineProperty(Package.prototype, 'files', {
  get: function() {
    return this._files;
  },
  set: function(value) {
    this._files = value;
  }
});

/**
 *  Structured Metadata subscription ( { "ApexClass" : [ "thisclass", "thatclass" ], "ApexPage" : "*" } )
 */
Object.defineProperty(Package.prototype, 'subscription', {
  get: function() {
    return this._subscription;
  },
  set: function(value) {
    this._subscription = value;
  }
});

/**
 *  File path of this package
 */
Object.defineProperty(Package.prototype, 'path', {
  get: function() {
    return this._path;
  },
  set: function(value) {
    this._path = value;
  }
});

// todo: some types dont support '*' subscription
Package.prototype._getSubscriptionFromMetadataTypeXmlNames = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var sub = {};
      _.each(self.metadataTypeXmlNames, function(typeXmlName) {
        sub[typeXmlName] = '*';
      });
      resolve(sub);
    } catch(err) {
      reject(new Error('Could not get package dictionary: '+err.message));
    }
  });
};

Package.prototype._getSubscriptionFromFiles = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var pkg = {};
      _.each(self.files, function(f) {
        var metadataTypeXmlName = f.type.xmlName;
        if (!_.has(pkg, metadataTypeXmlName)) {
          pkg[metadataTypeXmlName] = [f.name];
        } else {
          var value = pkg[metadataTypeXmlName];
          value.push(f.name);
        }
      });
      return resolve(pkg);
    } catch(err) {
      reject(new Error('Could not get package dictionary: '+err.message));
    }
  });  
};

Package.prototype.writeFile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!self.path) {
      return reject(new Error('Could not write to disk. Please specify package path'));
    }
    logger.debug('writing package to path: '+self.path);
    var xmlBody = self._serialize();
    fs.outputFile(self.path, xmlBody, function(err) {
      if (err) {
        reject(new Error('Could not write package to disk: '+err.message));
      } else {
        resolve();
      }
    });
  });
};

Package.prototype.writeFileSync = function() {
  var xmlBody = this._serialize();
  logger.debug('writing package to path: '+this.path);
  logger.debug(xmlBody);
  fs.outputFileSync(this.path, xmlBody);
};

/**
 * Inserts metadata to package subscription
 * @param  {Array of type Metadata} metadata
 * @return {None}
 */
Package.prototype.subscribe = function(files) {
  var self = this;
  if (!_.isArray(files)) {
    files = [files];
  }
  _.each(files, function(f) {
    // logger.debug('metadata type: ');
    // logger.debug(f.type);
    var metadataTypeXmlName = f.type.xmlName;
    if (_.has(self.subscription, metadataTypeXmlName)) {
      if (self.subscription[metadataTypeXmlName] === '*') {
        return false; // nothing to do here
      } else {
        if (self.subscription[metadataTypeXmlName].indexOf(f.subscriptionName) === -1) {
          self.subscription[metadataTypeXmlName].push(f.subscriptionName);
        }
      }
    } else {
      self.subscription[metadataTypeXmlName] = [f.subscriptionName];
    }
  });
};

/**
 * Removes metadata from package subscription
 * @param  {Array of type Metadata} metadata
 * @return {[type]}
 */
Package.prototype.unsubscribe = function(files) {
  var self = this;
  if (!_.isArray(files)) {
    files = [files];
  }
  _.each(files, function(f) {
    logger.debug('unsubscribing: '+f.name);
    logger.debug('type: '+f.type);
    var metadataTypeXmlName = f.type.xmlName;
    if (_.has(self.subscription, metadataTypeXmlName)) {
      if (self.subscription[metadataTypeXmlName] === '*') {
        return false; // nothing to do here
      } else {
        var members = self.subscription[metadataTypeXmlName];
        var newMembers = [];
        _.each(members, function(member) {
          if (member !== f.subscriptionName) {
            newMembers.push(member);
          }
        });
        self.subscription[metadataTypeXmlName] = newMembers;
      }
    } else {
      self.subscription[metadataTypeXmlName] = f.subscriptionName;
    }
  });
};


/** 
 * Take JS object representation of package.xml, serializes to XML
 * @param  {Object} packageXmlObject
 * @return {String}
 */
Package.prototype._serialize = function() {
  var self = this;
  logger.debug('serializing package:');
  logger.debug(self.subscription);
  var serialized = swig.renderFile(path.join('templates', 'package.xml'), {
    obj: self.subscription,
    apiVersion: config.get('mm_api_version')
  });
  return serialized;
};

/**
 * Parses package.xml to JS object
 * @param {String} path - disk path of package.xml
 * @return {Promise} - resolves to JavaScript object
 */
Package.prototype._deserialize = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var pkg = {};
    logger.debug('deserializing: '+self.path);
    if (!self.path) {
      reject(new Error('Please set package.xml path'));
    } else {
      fs.readFile(self.path, function(err, data) {
        if (err) {
          reject(err);
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
                reject(new Error('Could not parse package.xml'));
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
                resolve(pkg);
              }
            };
            parser.write(data.toString().trim()).close();
          } catch(e) {
            reject('Could not deserialize package: '+e.message);
          }
        }
      });
    }
  });
};

module.exports = Package;