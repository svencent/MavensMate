/**
 * @file Responsible for creating and deploying static resource bundles
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _               = require('lodash');
var fs              = require('fs-extra-promise');
var path            = require('path');
var Promise         = require('bluebird');
var Document        = require('../document').Document;
var CompileDelegate = require('../compile/delegate');
var util            = require('../util');
var logger          = require('winston');
var config          = require('../../config');

var ResourceBundleService = function(project) {
  this.project = project;
};

/**
 * Create resource bundles for the provided files
 * @param  {Array} staticResourcePaths - array of static resource paths
 * @return {Promise}
 */
ResourceBundleService.prototype.create = function(staticResourcePaths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug(staticResourcePaths);

    var files = [];
    var writePromises = [];
    _.each(staticResourcePaths, function(filePath) {
      logger.debug(p);
      var d = new Document(self.project, filePath);
      if (!d.existsOnFileSystem()) {
        throw new Error('Could not find static resource path');
      }
      if (d.getType() !== 'StaticResource') {
        throw new Error('Path provided is not a static resource');
      } else {
        var bundlePath = path.join(self.project.path, 'resource-bundles', [d.getName(), 'resource'].join('.'));
        if (fs.existsSync(bundlePath)) {
          throw new Error('Resource bundle path already exists.');
        }
        fs.ensureDirSync(bundlePath);
        writePromises.push(self._write(d.getPath(), bundlePath));
      }
    });

    Promise.all(writePromises)
      .then(function() {
        resolve();
      })
      .catch(function(e) {
        reject(new Error('Could not create resource bundle(s): '+e.message));
      })
      .done();
  });
};

/**
 * Writes static resource to the provided resource-bundle destination
 * @param  {String} staticResourcePath - location of static resource
 * @param  {String} destination        - location of static resource bundle
 * @return {Promise}
 */
ResourceBundleService.prototype._write = function(staticResourcePath, destination) {
  return new Promise(function(resolve, reject) {
    var readStream = fs.createReadStream(staticResourcePath);
    util.writeStream(readStream, destination, config.get('mm_legacy_unzip'))
      .then(function() {
        resolve(destination);
      })
      .catch(function(e) {
        reject(new Error('Could not write bundle stream for '+staticResourcePath+': '+e.message));
      })
      .done();
  });
};

/**
 * Deploys resource-bundles to server (zips bundle, copies to staticresources, deploys)
 * @param  {String} bundlePath - bundle path to deploy
 * @return {Promise}
 */
ResourceBundleService.prototype.deploy = function(bundlePaths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('deploying resource bundle paths: ', bundlePaths);

    var zipPromises = [];
    var staticResourcePaths = [];

    _.each(bundlePaths, function(bp) {
      var staticResourcePath = path.join(self.project.path, 'src', 'staticresources', path.basename(bp));
      logger.debug('static resource path', staticResourcePath);
      zipPromises.push(self._zip(bp, staticResourcePath));
      staticResourcePaths.push(staticResourcePath);
    });

    Promise.all(zipPromises)
      .then(function() {
        logger.debug('resource bundles zipped, prepping to deploy static resources');
        var compileDelegate = new CompileDelegate(self.project, staticResourcePaths);
        return compileDelegate.execute();
      })
      .then(function(result) {
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

ResourceBundleService.prototype._zip = function(bundlePath, staticResourcePath) {
  return new Promise(function(resolve, reject) {

    // remove static resource file
    if (fs.existsSync(staticResourcePath)) {
      fs.removeAsync(staticResourcePath)
        .then(function() {
          var staticResourceFileName = path.basename(bundlePath);
          logger.debug('zipping '+bundlePath+', TO: '+path.dirname(staticResourcePath));
          // zip resource-bundle directory, place in static resource path
          return util.zipDirectory(
                      bundlePath,
                      path.dirname(staticResourcePath),
                      '',
                      'resource',
                      staticResourceFileName.split('.')[0]);
        })
        .then(function() {
          resolve();
        })
        .catch(function(err) {
          reject(err);
        });
    }
  });
};

module.exports = ResourceBundleService;

