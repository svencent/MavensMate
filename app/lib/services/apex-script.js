/**
 * @file Service responsible for creating and running "Apex Scripts" (anonymous Apex). These scripts are usually stored in a project's apex-scripts directory.
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise   = require('bluebird');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('../util');
var _         = require('lodash');

/**
 * Service to create and execute anonymous Apex scripts
 * @param {Client} client
 */
var ApexScriptService = function(project) {
  if (!project) {
    throw new Error('ApexScriptService requires a valid project instance');
  }
  this.project = project;
};

/**
 * Creates new apex script
 * @param  {String} scriptPath
 * @return {Promise}
 */
ApexScriptService.prototype.create = function(name) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var dir = path.join(self.project.path, 'apex-scripts');
      fs.ensureDirSync(dir);
      fs.outputFileSync( path.join( dir, [name, 'cls'].join('.') ), '');
      resolve('Apex script created successfully');
    } catch(e) {
      reject(e);
    }
  });
};

/**
 * Executes apex script
 * @param  {String} scriptPath
 * @return {Promise}
 */
ApexScriptService.prototype.execute = function(scriptPaths) {
  var self = this;
  if (!_.isArray(scriptPaths)) {
    scriptPaths = [scriptPaths];
  }
  return new Promise(function(resolve, reject) {
    var scriptPromises = [];
    _.each(scriptPaths, function(sp) {
      var scriptBody = util.getFileBodySync(sp);
      var payload = {
        body: scriptBody
      };
      scriptPromises.push ( self.project.sfdcClient.executeApex(payload) );
    });

    Promise.all(scriptPromises)
      .then(function(results) {
        var result = {};
        _.each(scriptPaths, function(sp, i) {
          result[path.basename(sp)] = results[i];
        });
        resolve(result);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};


module.exports = ApexScriptService;