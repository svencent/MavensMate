var Promise         = require('bluebird');
var path            = require('path');
var fs              = require('fs-extra-promise');
var config          = require('../../config');
var util            = require('../util');
var logger          = require('winston');
var _               = require('lodash');
var MetadataHelper  = require('../metadata').MetadataHelper;

var LocalStore = function(project) {
  this._path = path.join(project.path, '.mavensmate', 'local.json');
  if (!fs.existsSync(this._path)) {
    LocalStore.create(project.path, []);
  }
  this._state = util.getFileBodySync(this._path, true);
};

LocalStore.prototype.getAll = function() {
  return this._state;
};

/**
 * Returns project setting if it exists, otherwise defaults to global
 * @param  {String} key - config key
 * @return {Object}     config value
 */
LocalStore.prototype.get = function(key) {
  return this._state[key];
};

LocalStore.prototype.getById = function(id) {
  return _.find(this._state, function(s) {
    return s.id === id;
  });
};

/**
 * Sets _state and write to file
 * @param {Object} settings
 */
LocalStore.prototype.set = function(contents, deferSave) {
  if (deferSave === undefined) deferSave = false;
  for (var key in contents) {
    this._state[key] = contents[key];
  }
  if (!deferSave) this._save();
};

/**
 * Saves the current _state to the disk
 * @return {void}
 */
LocalStore.prototype._save = function() {
  fs.outputFileSync(this._path, JSON.stringify(this._state, null, 4));
};

/**
 * Whether this is an object returned via a REST API query
 * @param  {[type]}  property [description]
 * @return {Boolean}          [description]
 */
LocalStore.prototype._isRestApiProperty = function(property) {
  return property.attributes && property.attributes.url;
};

/**
 * Returns keys relative to the server vs package (src/classes/foo.cls => classes/foo.cls)
 * @return {Array}
 */
LocalStore.prototype.getServerKeys = function() {
  return _.map(this._state, function(value, prop) {
    return prop.replace(/^src\//, '');
  });
};

LocalStore.prototype.removeById = function(ids) {
  var self = this;
  self._state = _.pickBy(self._state, function(value, key) {
    return ids.indexOf(value.id) === -1;
  });
  self._save();
};

LocalStore.prototype.removeKeyByRegEx = function(regEx) {
  var self = this;
  self._state = _.pickBy(self._state, function(value, key) {
    return regEx.exec(key) === null;
  });
  self._save();
};

LocalStore.prototype.update = function(serverProperties) {
  var self = this;
  serverProperties = util.ensureArrayType(serverProperties);
  logger.debug('mass updating localStore from server properties', serverProperties);
  if (self._isRestApiProperty(serverProperties[0])) {
    _.each(serverProperties, function(p) {
      var localStoreEntry = self.getById(p.Id);
      if (!localStoreEntry) {
        throw new Error('Could not locate local store entry for: '+p.Id);
      }
      localStoreEntry.fullName = p.Name;
      localStoreEntry.lastModifiedById = p.LastModifiedById;
      localStoreEntry.lastModifiedDate = p.LastModifiedDate;
      localStoreEntry.lastModifiedByName = p.LastModifiedBy.Name;
      localStoreEntry.createdDate = p.CreatedDate;
      localStoreEntry.createdById = p.CreatedById;
      localStoreEntry.createdByName = p.CreatedBy.Name;
      localStoreEntry.localState = 'clean';
    });
  } else {
    _.each(serverProperties, function(sp) {
      if (sp.fullName.indexOf('package.xml') === -1) {
        var key = sp.fileName.replace(/^unpackaged\//, 'src/'); // our root code directory is "src" to align with Force.com IDE
        var value = sp;
        value.localState = 'clean';
        self._state[key] = value;
      }
    });
  }
  this._save();
};

LocalStore.prototype.clean = function(serverProperties) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      self._state = {};
      serverProperties = util.ensureArrayType(serverProperties);
      _.each(serverProperties, function(sp) {
        if (sp.fullName.indexOf('package.xml') === -1) {
          var key = sp.fileName.replace(/^unpackaged\//, 'src/'); // our root code directory is "src" to align with Force.com IDE
          var value = sp;
          value.localState = 'clean';
          self._state[key] = value;
        }
      });
      self._save();
      resolve();
    } catch(e) {
      reject(e);
    }
  });
};

/**
 * Creates local.json for the project
 * @param  {Project} project
 * @param  {Object} settings
 * @return {LocalStore}
 */
LocalStore.create = function(projectPath, serverProperties) {
  return new Promise(function(resolve, reject) {
    serverProperties = util.ensureArrayType(serverProperties);
    var projectStorePath = path.join(projectPath, '.mavensmate', 'local.json');
    var store = {};
    var metadataHelper = new MetadataHelper();
    _.each(serverProperties, function(sp) {
      if (sp.fullName.indexOf('package.xml') === -1) {
        var key = sp.fileName.replace(/^unpackaged\//, 'src/'); // our root code directory is "src" to align with Force.com IDE
        var value = sp;
        value.localState = 'clean';
        store[key] = value;
      }
      var metadataType = metadataHelper.getTypeByPath(sp.fileName); // todo: deprecate metadatahelper
      if (!metadataType) {
        logger.warn('Could not determine metadata type for: '+JSON.stringify(sp));
      }
    });
    fs.outputFileSync(projectStorePath, JSON.stringify(store || {}, null, 4));
    resolve();
  });
};

module.exports = LocalStore;