'use strict';

var _               = require('lodash');
var fs              = require('fs-extra');
var path            = require('path');
var Promise         = require('bluebird');
var mavensMateFile  = require('./file');
var util            = require('./util').instance;
var logger          = require('winston');
var Deploy          = require('./deploy');
var archiver        = require('archiver');

var ResourceBundleService = function(project) {
  this.project = project;
};

/**
 * Create resource bundles for the provided files
 * @param  {Array} files - list of static resources
 * @return {Promise}       
 */
ResourceBundleService.prototype.create = function(staticResourcePaths) {
  var self = this;
  return new Promise(function(resolve, reject) { 
    logger.debug(staticResourcePaths);

    var files = [];
    var writePromises = [];
    _.each(staticResourcePaths, function(p) {
      logger.debug(p);
      var f = new mavensMateFile.MavensMateFile({ project: self.project, path: p });
      if (f.type.xmlName !== 'StaticResource') {
        throw new Error('File is not a static resource');
      } else {
        files.push(f);
        var bundlePath = path.join(self.project.path, 'resource-bundles', [f.name, 'resource'].join('.'));
        fs.ensureDirSync(bundlePath);
        writePromises.push(self._write(f.path, bundlePath));
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

    var files = [ new mavensMateFile.MavensMateFile({ project: self.project, path: staticResourcePath }) ];
    
    var compileSubscription = mavensMateFile.createPackageSubscription(files, self.project.packageXml);

    self._zip(bundlePath, staticResourcePath)
      .then(function() {
        logger.debug('directory zipped, prepping for deployment');
        var deploy = new Deploy({ project: self.project });
        deploy.compileWithMetadataApi(files, compileSubscription)
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
    var cwd = process.cwd();
    process.chdir(bundlePath);
    var output = fs.createWriteStream(staticResourcePath);
    var archive = archiver('zip');

    output.on('close', function () {
      process.chdir(cwd);
      resolve();
    });

    archive.on('error', function(err){
      logger.error('error creating zip file');
      logger.error(err);
      process.chdir(cwd);
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

