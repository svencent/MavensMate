'use strict';
var jsforce   = require('jsforce');
var Q         = require('q');
var fs        = require('fs');
var tmp       = require('tmp');
var _         = require('lodash');
var swig      = require('swig');
var fs        = require('fs');
var unzip     = require('unzip');
var xml2js    = require('xml2js');
var path      = require('path');

// opts = {
//   projectName,
//   sfdcSession,
//   directory,
//   subscription,
//   workspace
//   location
// };
function Project(opts) {
  this.opts = opts;
}

Project.prototype.retrieveAndWriteToDisk = function() {
  var deferred = Q.defer();
  var thiz = this;

  if (this.opts.package === undefined || this.opts.package === {}) {
    this.opts.package = [
      'ApexClass', 'ApexComponent', 'ApexPage', 'ApexTrigger', 'StaticResource'
    ];
  }

  global.sfdcClient.retrieveUnpackaged(this.opts.package)
    .then(function(zipPath) {
      fs.createReadStream(zipPath).pipe(unzip.Extract({
        path: thiz.opts.workspace
      })).on('error', (function(err) {
        deferred.reject(new Error(err));
      })(this)).on('close', (function() {
        

        deferred.resolve();
      })(this));
    });

  // this.writeDebug();
  // this.writeSettings();

  return deferred.promise;
};

// reverts project to server state based on package.xml
Project.prototype.clean = function() {
  var deferred = Q.defer();
  var thiz = this;

  var parser = new xml2js.Parser();
  fs.readFile(path.join(this.location, 'src', 'package.xml'), function(err, data) {
    parser.parseString(data, function (err, result) {
      console.log(result);
      global.sfdcClient.retrieveUnpackaged(result)
        .then(function(zipPath) {
          fs.createReadStream(zipPath).pipe(unzip.Extract({
            path: thiz.opts.workspace
          })).on('error', (function(err) {
            deferred.reject(new Error(err));
          })(this)).on('close', (function() {
            deferred.resolve();
          })(this));
        });  
    });
  });

  return deferred.promise;
};

Project.prototype.edit = function() {
  var deferred = Q.defer();
};

Project.prototype.delete = function() {
  var deferred = Q.defer();
};

Project.prototype.writeSettings = function() {

};

Project.prototype.writeDebug = function() {
	swig.renderFile('/templates/debug.json', {
		userIds: ['Paul', 'Jim', 'Jane']
	});
};

Project.prototype.write = function() {

};

module.exports = Project;
