var Promise         = require('bluebird');
var path            = require('path');
var fs              = require('fs-extra-promise');
var config          = require('../../config');
var util            = require('../util');
var logger          = require('winston');
var _               = require('lodash');
var Indexer         = require('../org/index');

var ServerStore = function(project) {
  this._path = path.join(project.path, '.mavensmate', 'server.json');
  if (!fs.existsSync(this._path)) {
    fs.outputJsonSync(this._path, []);
  }
};

ServerStore.prototype.initialize = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(self._path)) return resolve();
    util.getFileBody(self._path, true)
      .then(function(store) {
        self._state = store;
        resolve();
      })
      .catch(function(err) {
        if (err.message.indexOf('Unexpected end of input') > 0) {
          self._state = [];
          resolve();
        } else {
          reject(err);
        }
      });
  });
};

/**
 * Convenience method for determining whether the project has locally indexed metadata
 * @return {Boolean}
 */
ServerStore.prototype.hasIndex = function() {
  return this._state !== undefined && this._state !== [] && this._state !== {};
};

ServerStore.prototype.hasIndexForType = function(type) {
  var indexedType = _.find(this._state, function(s) {
    s.xmlName === type;
  });
  return indexedType !== undefined;
};

/**
 * Returns a representation of the store based on the project's package xml (move to package.js?)
 * @param  {SalesforceClient} sfdcClient
 * @param  {Object} packageXml
 * @return {Array}
 */
ServerStore.prototype.getIndexWithLocalSubscription = function(sfdcClient, packageXml) {
  var self = this;
  return new Promise(function(resolve, reject) {
    resolve(self._state);
  });
};

/**
 * Traverses the serverStore tree looking for an object with a property with a key value that matches the provided value
 * @param  {String} key - object key to look for "fileName"
 * @param  {String} value - object key value to find "classes/ChangePasswordController.cls"
 * @return {Object}
 */
ServerStore.prototype.find = function(key, value, srcArray) {
  function f(value, items) {
    var i = 0, found;
    for (; i < items.length; i++) {
      if (items[i][key] === value) {
        return items[i];
      } else if (_.isArray(items[i].children)) {
        found = f(value, items[i].children);
        if (found) {
          return found;
        }
      }
    }
  }
  return f(value, srcArray || this._state);
};

/**
 * Selects metadata from serverStore.json based on packagexml
 * @param  {Object} packageXml - packageXml.contents
 * @return {Array} - array of serverStore.json selected based on package.xml
 */
ServerStore.prototype.getSelected = function(packageXml) {
  var self = this;
  var myState = _.cloneDeep(this._state);

  // selects all nodes below the given entry, because dynatree will not do this automatically
  function selectAll(obj) {
    if (_.isArray(obj)) {
      _.each(obj, function(o) {
        o.selected = true;
        if (_.isArray(o.children)) {
          selectAll(o.children);
        }
      });
    } else if (_.isObject(obj)) {
      obj.selected = true;
      if (_.isArray(obj.children)) {
        selectAll(obj.children);
      }
    }
  }

  _.each(packageXml, function(members, typeXmlName) {
    if (members === '*') {
      var myEntry = self.find('packageId', typeXmlName, myState);
      selectAll(myEntry);
    } else {
      _.each(members, function(m) {
        var packageId = [typeXmlName, m.replace(/\//, '.')].join('.');
        var myEntry = self.find('packageId', packageId, myState);
        selectAll(myEntry);
      });
    }
  });
  return myState;
};

/**
 * Given an array of metadataTypes [ApexClass, ApexPage, etc.], indexes them from the salesforce server and update self._state & serverStore.json
 * @param  {SalesforceClient} sfdcClient
 * @param  {Array} metadataTypes - array of metadata types
 * @return {Promise}               - resolves to void
 */
ServerStore.prototype.refreshTypes = function(sfdcClient, metadataTypes) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var indexer = new Indexer(sfdcClient, metadataTypes);
    indexer.index()
      .then(function(indexResults) {
        _.each(indexResults, function(result, i) {
          var existingEntry = self.find('id', result.id); // todo: not particularly efficient in a loop
          if (existingEntry) {
            existingEntry.children = result.children;
          } else {
            self._state.push(result);
          }
        });
        return fs.outputFile(self._path, JSON.stringify(self._state || {}, null, 4))
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Creates server.json for the project
 * TODO: combine with refreshTypes
 * @param  {Project} project
 * @param  {Object} settings
 * @return {LocalStore}
 */
ServerStore.prototype.refresh = function(sfdcClient, metadataTypes) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var indexer = new Indexer(sfdcClient, metadataTypes);
    var newState;
    indexer.index()
      .then(function(index) {
        newState = index;
        return fs.outputFile(self._path, JSON.stringify(index || {}, null, 4))
      })
      .then(function() {
        self._state = newState;
        resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports = ServerStore;