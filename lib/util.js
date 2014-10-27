'use strict';

var fs 			    = require('fs');
var path        = require('path');
var Q           = require('q');
var unzip	      = require('unzip');
var crypto      = require('crypto');
var assert 	    = require('assert');
var _           = require('lodash');
var up          = require('underscore-plus');
var os          = require('os');
var stripJson   = require('strip-json-comments');
var archiver    = require('archiver');
var fstream     = require('fstream');
var unzip       = require('unzip');
var keytar      = require('keytar');

Q.longStackSupport = true;


function MavensMateUtil() {}

// TODO: move back to project?
MavensMateUtil.prototype.isValidProject = function() {
  return fs.existsSync(path.join(process.cwd(),'config', '.settings'));
};

// reads command payload (STDIN)
MavensMateUtil.prototype.readStdin = function() {
  var deferred = Q.defer();

  var myJson = '';

  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', function() {
    var chunk = process.stdin.read();
    if (chunk !== null) {
      myJson += chunk;
    }
  });

  process.stdin.on('end', function() {
    var jsonObject = JSON.parse(myJson);
    _.forOwn(jsonObject, function(value, key) {
      if (key.indexOf('_') >= 0) {
        jsonObject[up.camelize(key)] = jsonObject[key];
        delete jsonObject[key];
      }
    });
    deferred.resolve(jsonObject);
  });

  return deferred.promise;
};

// returns command payload (STDIN)
// if it's already been read, returns global.payload
MavensMateUtil.prototype.getPayload = function() {
  var deferred = Q.defer();
  if (global.payload === undefined) {
    this.readStdin()
      .then(function(stdin) {
        global.payload = stdin;
        deferred.resolve(global.payload);
      })
      ['catch'](function(error) {
        deferred.reject(error);
      });
  } else {
    return global.payload;
  }
  return deferred.promise;
};

MavensMateUtil.prototype.normalizeApiVersion = function() {
  global.mmApiVersion = String(global.config.get('mm_api_version')).replace('v','');
  if (!global.mmApiVersion.endsWith('.0')) {
    global.mmApiVersion = global.mmApiVersion+'.0';
  }
};

// prepares command response
MavensMateUtil.prototype.respond = function(program, res, success, error) { 
  // if we're headless, we need to properly format the response with JSON
  // otherwise we can just log the result

  if (this.isHeadless() && !this.isDebugging()) {
    var response = {};
    if (success === undefined) {
      success = true;
    }
    if (_.isArray(res)) {
      response.body = res;
      response.success = success;
    } else if (typeof res === 'object') {
      response.body = res;
      if (!_.has(res, 'success')) {
        response.success = success;
      }
    } else if (_.isString(res)) {
      response.body = res;
      response.success = success;
    }
    if (!success && error !== undefined) {
      response.body = error.message;
      response.stack = error.stack;
      console.error(JSON.stringify(response));
      process.exit(1);
    } else {
      console.log(JSON.stringify(response));
    }
  } else {
    console.log(res);
    if (!success && error !== undefined && error.stack !== undefined) {
      var endOfLine = require('os').EOL;
      console.error(endOfLine+'Promise Trace -->');
      var stackLines = error.stack.split(endOfLine);
      var errors = stackLines[0];
      _.each(errors.split('Error: '), function(e) {
        console.error(e);
      });
      stackLines.shift();
      console.error(endOfLine+'Stack Trace -->');
      console.error(stackLines.join(endOfLine));
    }
  }
};

MavensMateUtil.prototype.isHeadless = function() {
  return global.program.headless === true;
};

MavensMateUtil.prototype.getClient = function() {
  return global.program.client;
};

MavensMateUtil.prototype.isInteractive = function() {
  return !this.isHeadless();
};

MavensMateUtil.prototype.isUICommand = function(program) {
  return program.ui === true;
};

MavensMateUtil.prototype.isDebugging = function() {
  return global.program.debugging;
};

MavensMateUtil.prototype.isWindows = function() {
  return os.platform() === 'win32';
};

MavensMateUtil.prototype.getWindowsAppDataPath = function() {
  return process.env.APPDATA;
};

MavensMateUtil.prototype.isLinux = function() {
  return os.platform() === 'linux';
};

MavensMateUtil.prototype.isMac = function() {
  return os.platform() === 'darwin';
};

MavensMateUtil.prototype.getHomeDirectory = function() {
  if (this.isMac()) {
    return process.env.HOME;
  } else if (this.isWindows()) {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  } else if (this.isLinux()) {
    return process.env.HOME;
  }
};

MavensMateUtil.prototype.applyDefaultOptions = function(program) {
  program
    .option('-c', '--client [name]', 'Specifies the plugin client (SUBLIME_TEXT, ATOM)', 'SUBLIME_TEXT')
    .option('--ui', 'Launches the default UI for the selected command.')
    .option('--headless', 'Runs command in headless mode, requiring piped-JSON for context. Best for use by MavensMate text editor/IDE clients.');
  return program;
};

// takes an instance of an object
// applies the properties of opts to the instance
MavensMateUtil.prototype.applyProperties = function(instance, opts) {
  _.forOwn(opts, function(value, key) {
    if (key.indexOf('_') >= 0) {
      instance[up.camelize(key)] = value;
    } else {
      instance[key] = value;
    }
  });
};

MavensMateUtil.prototype.getFileBody = function(path, parseJSON) {
  var fileBody = fs.readFileSync(path, 'utf8');
  if (parseJSON) {
    fileBody = stripJson(fileBody);
    return JSON.parse(fileBody);
  } else {
    return fileBody;
  }
};

MavensMateUtil.prototype.storePassword = function(projectId, username, password) {
  return keytar.addPassword('MavensMate-'+projectId, username, password);
};

MavensMateUtil.prototype.replacePassword = function(projectId, username, password) {
  return keytar.replacePassword('MavensMate-'+projectId, username, password);
};

MavensMateUtil.prototype.getPassword = function(projectId, username) {
  return keytar.getPassword('MavensMate-'+projectId, username);
};

MavensMateUtil.prototype.zipDirectory = function(directoryToZip, zipFileDestination, dest) {
  var deferred = Q.defer();

  if (directoryToZip === undefined) {
    deferred.reject(new Error('Missing directory to zip'));
  }

  if (dest === undefined) {
    dest = 'unpackaged';
  }
  
  process.chdir(path.join(directoryToZip));
  var output = fs.createWriteStream(path.join(zipFileDestination, 'unpackaged.zip'));
  var archive = archiver('zip');

  output.on('close', function () {
    deferred.resolve();
  });

  archive.on('error', function(err){
    global.logger.error('error creating zip file');
    global.logger.error(err);
    deferred.reject(new Error('unable to create zip file'));
  });

  archive.pipe(output);
  archive.bulk([
      { src: ['**'], dest: dest }
  ]);
  archive.finalize();

  return deferred.promise;
};

MavensMateUtil.prototype.writeStream = function(readableStream, destination) {
  var deferred = Q.defer();
  
  try {
    readableStream
      .pipe(unzip.Parse())
      .pipe(fstream.Writer(destination))
        .on('error', function (error) {
          deferred.reject(new Error('Error writing stream: '+error.message));
        })
        .on('close', function() {            
          deferred.resolve(destination);
        });
  } catch(e) {
    deferred.reject(new Error('Could not write stream: '+e.message));
  }
  
  return deferred.promise;
};

var instance = new MavensMateUtil();
exports.instance = instance;