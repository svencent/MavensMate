'use strict';
var jsforce = require('jsforce');
var Q = require('q');
var fs = require('fs');
var tmp = require('tmp');
var _ = require('lodash');
var path = require('path');

// opts = {
//   accessToken : 'jksddfdf',
//   username : 'something@foo.com',
//   password : '4234234',
//   orgType : 'developer|production|sandbox|prerelease',
// }
function SalesforceClient(opts) {
  this.opts = opts;
  this.conn = null;
}

// logs into salesforce, retrieves session id (access token)
SalesforceClient.prototype.login = function() {
  var deferred = Q.defer();

  // optionally support the ability to pass in an access token
  var accessToken = this.opts.accessToken || undefined;
  var thiz = this;

  if (accessToken !== undefined) {
    this.conn = new jsforce.Connection({ accessToken: accessToken });
    global.sfdcClient = this;
  } else {
    this.conn = new jsforce.Connection();
    this.conn.login(this.opts.username, this.opts.password, function(err, res) {
      if (err) { 
        deferred.reject(new Error(err));
      } else {
        global.sfdcClient = thiz;
        deferred.resolve(res);
      }
    });
  }
  return deferred.promise;
};

SalesforceClient.prototype.retrievePackaged = function(packageNames) {
  var deferred = Q.defer();
  
  var r = global.sfdcClient.conn.metadata.retrieve({ packageNames: packageNames })
    .stream()
    .pipe(fs.createWriteStream('mavensmate.zip'));

  r.on('close', function() {
    console.log('ended!');
    deferred.resolve();
  });

  return deferred.promise;
};

SalesforceClient.prototype.retrieveUnpackaged = function(metadataTypesOrPackage) {
  var deferred = Q.defer();
  
  var unpackagedTypes = [];
  
  if (_.isArray(metadataTypesOrPackage)) {
    _.each(metadataTypesOrPackage, function(type) {
      unpackagedTypes.push({
        members: '*',
        name: type
      });
    });
  } else {
    _.forOwn(metadataTypesOrPackage, function(value, key) {
      unpackagedTypes.push({
        members: value,
        name: key
      });
    });  
  }

  // writes temp directory, puts zip file inside
  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(new Error(err));
    } else {
      var r = global.sfdcClient.conn.metadata.retrieve({ unpackaged: { types : unpackagedTypes } })
        .stream()
        .pipe(fs.createWriteStream(path.join(newPath,'unpackaged.zip')));

      r.on('close', function() {
        deferred.resolve(path.join(newPath,'unpackaged.zip'));
      });
    }
  });
  return deferred.promise;
};

SalesforceClient.prototype.describeGlobal = function() {
  var deferred = Q.defer();

  global.sfdcClient.conn.describeGlobal(function(err, res) {
    deferred.resolve(res); 
  });

  return deferred.promise;
};

module.exports = SalesforceClient;
