'use strict';

var fs          = require('fs-extra');
var path        = require('path');
var Promise     = require('bluebird');
var _           = require('lodash');
var up          = require('underscore-plus');
var os          = require('os');
var stripJson   = require('strip-json-comments');
var archiver    = require('archiver');
var fstream     = require('fstream');
// var tty         = require('tty');
// var parseArgs   = require('minimist');
var logger      = require('winston');
var AdmZip      = require('adm-zip');

// Q.longStackSupport = true;

function MavensMateUtil() {}

MavensMateUtil.prototype.getAppRoot = function() {
  return path.resolve(path.join(__dirname, '..', '..'));
};

MavensMateUtil.prototype.logMetadata = function(logger, metadata) {
  _.each(metadata, function(m) {
    logger.debug(m.toString());
  });
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

/**
 * Check if a directory is empty synchronously (courtesy: https://github.com/codexar/npm-extfs)
 *
 * @param {string} searchPath
 */
MavensMateUtil.prototype.isDirectoryEmptySync = function (searchPath) {
  var stat;
  try {
    stat = fs.statSync(searchPath);
  } catch (e) {
    return true;
  }
  if (stat.isDirectory()) {
    var items = fs.readdirSync(searchPath);
    var visibleItems = [];
    _.each(items, function(i) {
      if (i[0] !== '.') {
        visibleItems.push(i);
      }
    });
    return visibleItems.length === 0;
  }
};

/**
 * Walks directory recursively, returns a list of file paths
 * @param  {String}   dir  - dir path
 * @param  {Function} done - callback
 * @return {Callback} err, array of file paths
 */
MavensMateUtil.prototype.walk = function(dir, done) {
  var self = this;
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err);
    }
    var pending = list.length;
    if (!pending) {
      return done(null, results);
    }
    list.forEach(function(file) {
      file = dir + path.sep + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          self.walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) {
              done(null, results);
            }
          });
        } else {
          results.push(file);
          if (!--pending) {
            done(null, results);
          }
        }
      });
    });
  });
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
  return new Promise(function(resolve, reject) {

  var myJson = '';

  // TODO: verify this works cross-platform
  // if(tty.isatty(process.stdin)) {
  //   resolve({});
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
    resolve(jsonObject);
  });

  });
};

// returns command payload (STDIN)
// if it's already been read, returns global.payload
MavensMateUtil.prototype.getPayload = function() {
  return new Promise(function(resolve, reject) {
  this.readStdin()
    .then(function(stdin) {
      resolve(stdin);
    })
    .catch(function(error) {
      reject(new Error('Could not read STDIN: '+error.message));
    });
  });
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

MavensMateUtil.prototype.zipDirectory = function(directoryToZip, zipFileDestination, dest) {
  return new Promise(function(resolve, reject) {

    if (directoryToZip === undefined) {
      reject(new Error('Missing directory to zip'));
    }

    if (dest === undefined) {
      dest = 'unpackaged';
    }
    var cwd = process.cwd();
    // logger.debug('\n\n\n\n-----=======> CHANGING DIRECTORY');
    process.chdir(path.join(directoryToZip));
    var output = fs.createWriteStream(path.join(zipFileDestination, 'unpackaged.zip'));
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
        { src: ['**'], dest: dest }
    ]);
    archive.finalize();
  });
};

/**
 * Writes a readable stream to disk (assumes zip)
 * We have to write the stream to the disk THEN unzip because of issues with npm's unzip
 * @param  {Stream} readableStream
 * @param  {String} destination    
 * @return {Promise}                
 */
MavensMateUtil.prototype.writeStream = function(readableStream, destination) {
  return new Promise(function(resolve, reject) {
  var tmpZipLocation = path.join(destination, 'tmp.zip');
  try {
    readableStream
      .pipe(fstream.Writer(tmpZipLocation))
        .on('error', function (error) {
          reject(new Error('Error writing stream: '+error.message));
        })
        .on('close', function() {            
          var zip = new AdmZip(tmpZipLocation);
          zip.extractAllTo(destination);
          fs.removeSync(tmpZipLocation);
          resolve(destination);
        });
  } catch(e) {
    reject(new Error('Could not write stream: '+e.message));
  }
  });
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