var Promise           = require('bluebird');
var fs                = require('fs-extra-promise');
var find              = require('findit');
var path              = require('path');
var logger            = require('winston');
var util              = require('../util');
var Config            = require('./config');

/**
 * Whether the given project path needs upgrading to new project structure
 * @param  {String} projectPath - path of a project on the disk
 * @return {Boolean}
 */
module.exports.needsUpgrade = function(projectPath) {
  return fs.existsSync(path.join(projectPath, 'config'));
};

/**
 * Upgrades project from legacy structure (project/config) to new structure (project/.mavensmate)
 * @param  {String} projectPath - path of a project on the disk
 * @return {void}
 */
module.exports.upgradeProject = function(projectPath) {
  try {
    var mavensmatePath = path.join(projectPath, '.mavensmate');
    fs.ensureDirSync(mavensmatePath);

    var configPath = path.join(projectPath, 'config');
    var settingsPath = path.join(configPath, '.settings');
    var symbolsPath = path.join(configPath, '.symbols');

    if (fs.existsSync(settingsPath)) {
      fs.copySync(settingsPath, path.join(mavensmatePath, 'project.json'));
    }

    if (fs.existsSync(symbolsPath)) {
      fs.copySync(symbolsPath, path.join(mavensmatePath, '.symbols'));
    }

    Config.create(projectPath, {
      'mm_api_version' : config.get('mm_api_version')
    });

    util.emptyDirectoryRecursiveSync(configPath);
    fs.removeSync(configPath);
  } catch(e) {
    logger.error(e);
    throw new Error('Could not upgrade project: ', e.message);
  }
};

/**
 * Copies files to project directory, overwriting when necessary
 * @param  {String} fromPath
 * @param  {String} toPath
 * @param  {Boolean} replacePackageXml - whether to replace package.xml in src directory
 * @return {Promise}
 */
module.exports.copy = function(fromPath, toPath, replacePackageXml) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (replacePackageXml === undefined) replacePackageXml = false;
      var fileFinder = find(fromPath);
      fileFinder.on('file', function (file) {
        var fileBasename = path.basename(file);
        // file => /foo/bar/myproject/unpackaged/classes/myclass.cls
        logger.debug('refreshing file: '+file);

        var directory = path.dirname(file); //=> /foo/bar/myproject/unpackaged/classes
        var destinationDirectory = directory.replace(fromPath, toPath); //=> /foo/bar/myproject/src/classes

        // make directory if it doesnt exist (parent dirs included)
        if (!fs.existsSync(destinationDirectory)) {
          fs.mkdirpSync(destinationDirectory);
        }

        if (replacePackageXml && fileBasename === 'package.xml') {
          fs.removeSync(path.join(destinationDirectory, fileBasename));
          fs.copySync(file, path.join(destinationDirectory, fileBasename));
        } else if (fileBasename !== 'package.xml') {
          fs.removeSync(path.join(destinationDirectory, fileBasename));
          fs.copySync(file, path.join(destinationDirectory, fileBasename));
        }
      });
      fileFinder.on('end', function () {
        if (fs.existsSync(fromPath)) {
          fs.removeAsync(fromPath)
            .then(function() {
              resolve();
            })
            .catch(function(err) {
              reject(err);
            });
        } else {
          resolve();
        }
        resolve();
      });
      fileFinder.on('error', function (err) {
        logger.debug('Could not process retrieved metadata: '+err.message);
        reject(err);
      });
    } catch(e) {
      reject(e);
    }
  });
};
