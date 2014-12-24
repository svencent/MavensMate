'use strict';

var fs        = require('fs-extra');
var path      = require('path');
var Promise         = require('bluebird');
var _         = require('lodash');
var Metadata  = require('./metadata').Metadata;
var util      = require('./util').instance;
var logger    = require('winston');
var Deploy    = require('./deploy');
var archiver  = require('archiver');

var ResourceBundleService = function(project) {
  this.project = project;
};

/**
 * Create resource bundles for the provided files
 * @param  {Array} files - list of static resources
 * @return {Promise}       
 */
ResourceBundleService.prototype.create = function(files) {
  var self = this;
  return new Promise(function(resolve, reject) { 
    logger.debug(files);

    var metadata = [];
    var writePromises = [];
    _.each(files, function(f) {
      logger.debug(f);
      var m = new Metadata({ project: self.project, path: f });
      if (m.getType().xmlName !== 'StaticResource') {
        throw new Error('File is not a static resource');
      } else {
        metadata.push(m);
        var bundlePath = path.join(self.project.path, 'resource-bundles', [m.getName(), 'resource'].join('.'));
        fs.ensureDirSync(bundlePath);
        writePromises.push(self._write(m.getPath(), bundlePath));
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
    util.writeStream(readStream, destination)
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
ResourceBundleService.prototype.deploy = function(bundlePath) {
  var self = this;
  return new Promise(function(resolve, reject) { 
    logger.debug('deploying resource bundle: '+bundlePath);

    var staticResourcePath = path.join(self.project.path, 'src', 'staticresources', path.basename(bundlePath));
    //var staticResourcePath = path.join(self.project.path, 'src', 'staticresources', 'foo.zip');

    logger.debug('static resource path is: '+staticResourcePath);

    var metadata = [ new Metadata({ project: self.project, path: staticResourcePath }) ];
    
    self._zip(bundlePath, staticResourcePath)
      .then(function() {
        logger.debug('directory zipped, prepping for deployment');
        var deploy = new Deploy({ project: self.project });
        deploy.compileWithMetadataApi(metadata)
          .then(function(result) {
            resolve(result);
          })
          .catch(function(error) {
            reject(error);
          })
          .done();
      })
      .catch(function(error) {
        reject(new Error('Could not deploy resource bundle: '+error.message));
      })
      .done();
  });
};

ResourceBundleService.prototype._zip = function(bundlePath, staticResourcePath) {
  return new Promise(function(resolve, reject) { 
    logger.debug('zipping '+bundlePath+', TO: '+staticResourcePath);

    process.chdir(bundlePath);
    var output = fs.createWriteStream(staticResourcePath);
    var archive = archiver('zip');

    output.on('close', function () {
      resolve();
    });

    archive.on('error', function(err){
      logger.error('error creating zip file');
      logger.error(err);
      reject(new Error('unable to create zip file'));
    });

    archive.pipe(output);
    archive.bulk([
        { src: ['**'] }
    ]);
    archive.finalize();
  });
};

module.exports = ResourceBundleService;

