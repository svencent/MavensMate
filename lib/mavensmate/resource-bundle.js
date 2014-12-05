'use strict';

var fs        = require('fs-extra');
var path      = require('path');
var Q         = require('q');
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
  var deferred = Q.defer(); 
  var self = this;

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

  Q.all(writePromises)
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(e) {
      deferred.reject(new Error('Could not create resource bundle(s): '+e.message));
    })
    .done();

  return deferred.promise;
};

/**
 * Writes static resource to the provided resource-bundle destination
 * @param  {String} staticResourcePath - location of static resource
 * @param  {String} destination        - location of static resource bundle
 * @return {Promise}                    
 */
ResourceBundleService.prototype._write = function(staticResourcePath, destination) {
  var deferred = Q.defer(); 
  var readStream = fs.createReadStream(staticResourcePath);
  util.writeStream(readStream, destination)
    .then(function() {
      deferred.resolve(destination);
    })
    ['catch'](function(e) {
      deferred.reject(new Error('Could not write bundle stream for '+staticResourcePath+': '+e.message));
    })
    .done();
  return deferred.promise;
};

/**
 * Deploys resource-bundles to server (zips bundle, copies to staticresources, deploys)
 * @param  {String} bundlePath - bundle path to deploy
 * @return {Promise}  
 */
ResourceBundleService.prototype.deploy = function(bundlePath) {
  var deferred = Q.defer(); 
  var self = this;

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
          deferred.resolve(result);
        })
        ['catch'](function(error) {
          deferred.reject(error);
        })
        .done();
    })
    ['catch'](function(error) {
      deferred.reject(new Error('Could not deploy resource bundle: '+error.message));
    })
    .done();

  return deferred.promise;
};

ResourceBundleService.prototype._zip = function(bundlePath, staticResourcePath) {
  var deferred = Q.defer(); 

  logger.debug('zipping '+bundlePath+', TO: '+staticResourcePath);

  process.chdir(bundlePath);
  var output = fs.createWriteStream(staticResourcePath);
  var archive = archiver('zip');

  output.on('close', function () {
    deferred.resolve();
  });

  archive.on('error', function(err){
    logger.error('error creating zip file');
    logger.error(err);
    deferred.reject(new Error('unable to create zip file'));
  });

  archive.pipe(output);
  archive.bulk([
      { src: ['**'] }
  ]);
  archive.finalize();
  return deferred.promise;
};

module.exports = ResourceBundleService;

