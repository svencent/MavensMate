'use strict';

var fs          = require('fs');
var path        = require('path');
var Q           = require('q');
var unzip       = require('unzip');
var _           = require('lodash');
var up          = require('underscore-plus');
var os          = require('os');
var stripJson   = require('strip-json-comments');
var archiver    = require('archiver');
var fstream     = require('fstream');
var unzip       = require('unzip');
var keytar      = require('keytar');
// var tty         = require('tty');
// var parseArgs   = require('minimist');
var logger      = require('winston');

// Q.longStackSupport = true;


function MavensMateUtil() {}

MavensMateUtil.prototype.getAppRoot = function() {
  return path.resolve(path.join(__dirname, '..', '..'));
};

MavensMateUtil.prototype.endsWith = function(string, suffix) {
  string = string.toLowerCase();
  suffix = suffix.toLowerCase();
  return string.indexOf(suffix, string.length - suffix.length) !== -1;
};

MavensMateUtil.prototype.startsWith = function(string, prefix) {
  string = string.toLowerCase();
  prefix = prefix.toLowerCase();
  return prefix.length > 0 && string.substring( 0, prefix.length ) === prefix;
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

// reads command payload (STDIN)
MavensMateUtil.prototype.readStdin = function() {
  var deferred = Q.defer();

  var myJson = '';

  // TODO: verify this works cross-platform
  // if(tty.isatty(process.stdin)) {
  //   deferred.resolve({});
  // }

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
  this.readStdin()
    .then(function(stdin) {
      deferred.resolve(stdin);
    })
    ['catch'](function(error) {
      deferred.reject(new Error('Could not read STDIN: '+error.message));
    });
  return deferred.promise;
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

MavensMateUtil.prototype.joinForQuery = function(strings) {
  return '\''+strings.join('\',\'')+'\'';
};

MavensMateUtil.prototype.storePassword = function(id, password) {
  return keytar.addPassword('MavensMate: '+id, id, password);
};

MavensMateUtil.prototype.replacePassword = function(id, password) {
  return keytar.replacePassword('MavensMate: '+id, id, password);
};

MavensMateUtil.prototype.getPassword = function(id) {
  return keytar.getPassword('MavensMate: '+id, id);
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
    logger.error('error creating zip file');
    logger.error(err);
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

MavensMateUtil.prototype.chunkArray = function(arr, chunkSize) {
  return [].concat.apply([],
    arr.map(function(elem,i) {
      return i%chunkSize ? [] : [arr.slice(i,i+chunkSize)];
    })
  );
};

MavensMateUtil.prototype.splitArray = function(a, n) {
  var len = a.length,out = [], i = 0;
  while (i < len) {
      var size = Math.ceil((len - i) / n--);
      out.push(a.slice(i, i + size));
      i += size;
  }
  return out;
};

var instance = new MavensMateUtil();
exports.instance = instance;