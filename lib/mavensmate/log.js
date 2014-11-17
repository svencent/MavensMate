'use strict';

var Q       = require('q');
var fs      = require('fs-extra');
var path    = require('path');
var moment  = require('moment');

var LogService = function(project) {
  this.project = project;
};

LogService.prototype.downloadLog = function(logId) {
  var deferred = Q.defer();
  var self = this;

  // create test name directory in debug/tests
  if (!fs.existsSync(path.join(self.project.path, 'debug', 'logs'))) {
    fs.mkdirpSync(path.join(self.project.path, 'debug', 'logs'));
  }

  var url = self.project.sfdcClient.conn.tooling._baseUrl() + '/sobjects/ApexLog/'+logId+'/Body';
  self.project.sfdcClient.conn.tooling._request(url, function(err, res) {
    if (err) { 
      deferred.reject(new Error('Could not download log: '+err.message));  
    } else {
      var logFileName = [moment().format('YYYY-MM-DD HH-mm-ss'), 'log'].join('.');
      var filePath = path.join(self.project.path, 'debug', 'logs', logFileName);
      fs.outputFile(filePath, res, function(e) {
        if (e) {
          deferred.reject(new Error('Could not write log file: '+e.message));  
        } else {
          deferred.resolve(filePath);
        }
      });
    }
  });

  return deferred.promise;
};

module.exports = LogService;