/**
 * @file Responsible for downloading Salesforce logs to the local project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _         = require('lodash');
var Promise   = require('bluebird');
var fs        = require('fs-extra');
var path      = require('path');
var moment    = require('moment');
var events    = require('events');
var inherits  = require('inherits');
var logger    = require('winston');

var LogService = function(project) {
  this.project = project;
};

inherits(LogService, events.EventEmitter);

LogService.prototype.downloadLog = function(logId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // create test name directory in debug/tests
    if (!fs.existsSync(path.join(self.project.path, 'debug', 'logs'))) {
      fs.mkdirpSync(path.join(self.project.path, 'debug', 'logs'));
    }

    var url = self.project.sfdcClient.conn.tooling._baseUrl() + '/sobjects/ApexLog/'+logId+'/Body';
    self.project.sfdcClient.conn.tooling.request(url, function(err, res) {
      if (err) { 
        reject(new Error('Could not download log: '+err.message));  
      } else {
        var logFileName = [moment().format('YYYY-MM-DD HH-mm-ss'), 'log'].join('.');
        var filePath = path.join(self.project.path, 'debug', 'logs', logFileName);
        fs.outputFile(filePath, res, function(e) {
          if (e) {
            reject(new Error('Could not write log file: '+e.message));  
          } else {
            self.emit('mavensmate-log-downloaded', filePath);
            resolve(filePath);
          }
        });
      }
    });
  });
};

LogService.prototype.getLogs = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var projectLogsPath = path.join(self.project.path, 'debug', 'logs');
      var logPaths = [];
      fs.readdir(projectLogsPath, function(err, files) {
        _.each(files, function(f) {
          logPaths.push(path.join(projectLogsPath, f));
        });
        logPaths.sort(function(a, b){
            return moment(b, 'YYYY-MM-DD HH:mm:ss').toDate().getTime() 
                    - moment(a, 'YYYY-MM-DD HH:mm:ss').toDate().getTime();
        });
        resolve(logPaths);
      });
    } catch(e) {
      reject(e);
    }
  });
};

LogService.prototype.getLog = function(location) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (!fs.existsSync(location)) {
        return reject(new Error('Log file not found'))
      }
      fs.readFile(location, 'utf8', function (err, data) {
        if (err) {
          reject(err);
        } else {
          var fileLines = data.toString().split(/\r?\n/);
          logger.debug('doneeee');
          resolve(fileLines);
        }
      });
    } catch(e) {
      reject(e);
    }
  });
};

LogService.prototype.filter = function(location, keyword) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (!fs.existsSync(location)) {
        return reject(new Error('Log file not found'))
      }
      var matchingLines = [];
      /*
        Matching by the timestamp at the very begining of every log entry.
        Using positive lookahead (?=) because it doesn't remove the matching string from the returned splits (don't want to actually remove the timestamps).
        Using the modifiers:
        - global : Don't return on first match.
        - multi-line : ^ and $ match the begining and end of each line instead of string only.
      */
      var fileLines = fs.readFileSync(location, 'utf8').toString().split(/(?=^\d{2}:\d{2}:\d{2}\.\d+ \(\d+\)\|)/gm);
      var matcher = new RegExp(keyword, 'i');
      _.each(fileLines, function(fl) {
        if (matcher.test(fl)) {
          matchingLines.push(fl);
        }
      });
      resolve(matchingLines);
    } catch(e) {
      reject(e);
    }
  });
};

module.exports = LogService;
