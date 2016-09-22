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
  this._state = util.getFileBodySync(this._path, true);
};

/**
 * Returns project setting if it exists, otherwise defaults to global
 * @param  {String} key - config key
 * @return {Object}     config value
 */
LocalStore.prototype.get = function(key) {
  if (key in this._state) {
    return this._state[key];
  } else {
    return config.get(key);
  }
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

LocalStore.prototype.update = function(serverProperties) {
  var self = this;
  serverProperties = util.ensureArrayType(serverProperties);
  logger.debug('mass updating localStore from server properties', serverProperties);
  if (self._isRestApiProperty(serverProperties[0])) {
    _.each(serverProperties, function(p) {
      var localStoryEntry = self.getById(p.Id);
      localStoryEntry.lastModifiedById = p.LastModifiedById;
      localStoryEntry.lastModifiedDate = p.LastModifiedDate;
      localStoryEntry.lastModifiedByName = p.LastModifiedBy.Name;
      localStoryEntry.createdDate = p.CreatedDate;
      localStoryEntry.createdById = p.CreatedById;
      localStoryEntry.createdByName = p.CreatedBy.Name;
      localStoryEntry.localState = 'clean';
    });
  } else {
    // from metadata api
    // _.each(serverProperties, function(p) {
    //   self.set(p);
    // });
    // todo
  }
  this._save();
};

/**
 * Creates local.json for the project
 * @param  {Project} project
 * @param  {Object} settings
 * @return {LocalStore}
 */
LocalStore.create = function(projectPath, fileProperties) {
  return new Promise(function(resolve, reject) {
    var projectStorePath = path.join(projectPath, '.mavensmate', 'local.json');
    var store = {};
    var metadataHelper = new MetadataHelper();
    _.each(fileProperties, function(fp) {
      if (fp.fullName.indexOf('package.xml') === -1) {
        var key = fp.fileName.replace(/^unpackaged\//, 'src/'); // our root code directory is "src" to align with Force.com IDE
        var value = fp;
        value.localState = 'clean';
        store[key] = value;
      }
      var metadataType = metadataHelper.getTypeByPath(fp.fileName); // todo: deprecate metadatahelper
      if (!metadataType) {
        logger.warn('Could not determine metadata type for: '+JSON.stringify(fp));
      }
    });
    fs.outputFileSync(projectStorePath, JSON.stringify(store || {}, null, 4));
    resolve();
  });
};

module.exports = LocalStore;