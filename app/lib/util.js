/**
 * @file Collection of utility functions
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var spawn       = require('child_process').spawn;
var fs          = require('fs-extra-promise');
var path        = require('path');
var Promise     = require('bluebird');
var _           = require('lodash');
var os          = require('os');
var stripJson   = require('strip-json-comments');
var fstream     = require('fstream');
var archiver    = require('archiver');
var logger      = require('winston');
var which       = require('which');
var camelize    = require('./utilities/camelize');
var yauzl       = require("yauzl");

var platformHash = {
  darwin: 'osx',
  linux: 'linux',
  win32: 'windows'
};

exports.platformConfigKey = platformHash[os.platform()]

exports.getAppRoot = function() {
  return path.resolve(path.join(__dirname, '..', '..'));
};

exports.isCredentialsError = function(err) {
  return err.message.indexOf('expired access/refresh token') >= 0
      || err.message.indexOf('Could not retrieve credentials') >= 0
      || err.message.indexOf('INVALID_SESSION_ID') >= 0
      || err.message.indexOf('INVALID_LOGIN') >= 0;
};

exports.getProjectById = function(app, id) {
  var projects = app.get('projects');
  if (id) {
    return _.find(projects, function(p) {
      return p.projectJson.get('id') === id;
    });
  }
  return null;
};

/**
 * Returns a string representing a default workspace
 * @return {String}
 */
exports.getDefaultWorkspaceSetting = function() {
  if (this.isMac()) {
    return path.join(process.env.HOME, 'Documents');
  } else if (this.isWindows()) {
    return path.join(process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'], 'Documents');
  } else if (this.isLinux()) {
    return process.env.HOME;
  }
};

exports.endsWith = function(string, suffix) {
  string = string.toLowerCase();
  suffix = suffix.toLowerCase();
  return string.indexOf(suffix, string.length - suffix.length) !== -1;
};

exports.ensureArrayType = function(t) {
  if (_.isObject(t) && !_.isArray(t)) {
    return [t];
  } else if (_.isArray(t)) {
    return t;
  } else {
    throw new Error('Unrecognized type');
  }
};

exports.startsWith = function(string, prefix) {
  string = string.toLowerCase();
  prefix = prefix.toLowerCase();
  return prefix.length > 0 && string.substring( 0, prefix.length ) === prefix;
};

exports.isWindows = function() {
  return os.platform() === 'win32';
};

exports.getWindowsAppDataPath = function() {
  return process.env.APPDATA;
};

exports.isLinux = function() {
  return os.platform() === 'linux';
};

exports.isMac = function() {
  return os.platform() === 'darwin';
};

exports.isValidProjectPath = function(projectPath) {
  return fs.existsSync(path.join(projectPath, 'config', '.settings')) || fs.existsSync(path.join(projectPath, '.mavensmate'))
};

exports.getHomeDirectory = function() {
  if (this.isMac()) {
    return process.env.HOME;
  } else if (this.isWindows()) {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  } else if (this.isLinux()) {
    return process.env.HOME;
  }
};

exports.removeEmptyDirectoriesRecursiveSync = function(directory) {
  logger.silly('----------> removing empty directories from', directory);
  var removeEmptyDirs = function(dir) {
    var files = fs.readdirSync(dir);
    logger.silly('files in directory', dir, files);
    if (files.length === 0 && dir !== directory) {
      // directory is empty, simple remove it
      fs.removeSync(dir);
    } else {
      for (var i = 0; i < files.length; i++) {
        var filePath = path.join(dir, files[i]);
        logger.silly(filePath);
        var stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          logger.silly('---> directory', filePath);
          removeEmptyDirs(filePath);
        }
      }
      files = fs.readdirSync(dir);
      if (files.length === 0 && dir !== directory) {
        fs.removeSync(dir);
      }
    }
  };
  removeEmptyDirs(directory);
};

exports.emptyDirectoryRecursiveSync = function(directory) {
  var emptyDir = function(dir) {
    logger.silly('----------> emptying directory', dir);
    var files = fs.readdirSync(dir);
    logger.silly('files', files);
    if (files.length > 0) {
      for (var i = 0; i < files.length; i++) {
        var fileBasename = files[i];
        var filePath = path.join(dir, files[i]);
        logger.silly(filePath);
        var stats = fs.statSync(filePath);
        if (stats.isFile()) {
          logger.silly('---> file, unlinking', filePath);
          fs.unlinkSync(filePath);
        } else if (stats.isDirectory() && fileBasename !== '.svn' && fileBasename !== '.git') {
          logger.silly('---> directory', filePath);
          emptyDir(filePath);
        }
      }
    }
  };
  emptyDir(directory);
};

/**
 * Takes an array of path strings and returns an array of absolute paths
 * @param  {Array} paths
 * @return {Array} absolute paths
 */
exports.getAbsolutePaths = function(paths) {
  var resolvedPaths = [];
  _.each(paths, function(p) {
    if (path.resolve(p) !== path.normalize(p).replace(new RegExp(path.sep+'$'), '' )) {
      // relative path
      resolvedPaths.push( path.resolve(p) );
    } else {
      resolvedPaths.push(p);
    }
  });
  return resolvedPaths;
};

/**
 * Check if a directory is empty synchronously (courtesy: https://github.com/codexar/npm-extfs)
 *
 * @param {string} searchPath
 */
exports.isDirectoryEmptySync = function (searchPath) {
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
exports.walkSync = function(dir) {
  var walk = function(dir) {
    var _walk;
    _walk = function(dir) {
      var fn, fns, _i, _len, _results;
      fns = fs.readdirSync(dir);
      _results = [];
      for (_i = 0, _len = fns.length; _i < _len; _i++) {
        fn = fns[_i];
        fn = dir + path.sep + fn;
        if (fs.statSync(fn).isDirectory()) {
          _results.push(_walk(fn));
        } else {
          _results.push(fn);
        }
      }
      return _results;
    };
    return _walk(dir);
  };

  return _.flatten( walk(dir) );
};

/**
 * Returns a list of top-level directories in a given directory
 * @param  {String}   dir  - dir path
 * @return {Array} directories
 */
exports.listDirectories = function(dir) {
  var contents = fs.readdirSync(dir);
  var directories = [];
  _.each(contents, function(c) {
    if (fs.statSync(path.join(dir,c)).isDirectory()) {
      directories.push(path.join(dir,c));
    }
  });
  return directories;
};

// reads command payload (STDIN)
exports.readStdin = function() {
  return new Promise(function(resolve, reject) {
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
          jsonObject[camelize(key)] = jsonObject[key];
          delete jsonObject[key];
        }
      });
      resolve(jsonObject);
    });
  });
};

// returns command payload (STDIN)
// if it's already been read, returns global.payload
exports.getPayload = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.readStdin()
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
exports.applyProperties = function(instance, opts) {
  _.forOwn(opts, function(value, key) {
    if (key.indexOf('_') >= 0) {
      instance[camelize(key)] = value;
    } else {
      instance[key] = value;
    }
  });
};

exports.getFileBodySync = function(filePath, parseJSON) {
  var fileBody = fs.readFileSync(filePath, 'utf8');
  if (parseJSON) {
    fileBody = stripJson(fileBody);
    return JSON.parse(fileBody);
  } else {
    return fileBody;
  }
};

exports.getFileBody = function(filePath, parseJSON) {
  return new Promise(function(resolve, reject) {
    try {
      fs.readFile(filePath, 'utf8', function(err, fileBody) {
        if (err) {
          throw err;
        } else {
          if (fileBody === '' && parseJSON) {
            resolve({});
          } else if (parseJSON) {
            fileBody = stripJson(fileBody);
            resolve(JSON.parse(fileBody));
          } else {
            resolve(fileBody);
          }
        }
      });
    } catch(e) {
      reject(e);
    }
  });
};

exports.joinForQuery = function(strings) {
  return '\''+strings.join('\',\'')+'\'';
};

exports.zipDirectory = function(directoryToZip, zipFileDestination, dest, ext, filename) {
  return new Promise(function(resolve, reject) {

    if (!directoryToZip) {
      return reject(new Error('Missing directory to zip'));
    }

    if (dest === undefined) {
      dest = 'unpackaged';
    }
    if (ext === undefined) {
      ext = 'zip';
    }
    filename = filename || dest;
    var cwd = process.cwd();
    // logger.debug('\n\n\n\n-----=======> CHANGING DIRECTORY');
    process.chdir(path.join(directoryToZip));
    var output = fs.createWriteStream(path.join(zipFileDestination, filename+'.'+ext));
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

exports.unzipLegacy = function(tmpZipLocation, destination) {
  logger.debug('unzipping response via unzipLegacy');
  var self = this;
  return new Promise(function(resolve, reject) {
    var unzipCommand;
    if (self.isMac() || self.isLinux()) {
      unzipCommand = spawn('unzip', [ tmpZipLocation, '-d', destination ], { stdio: [ 'ignore', 'ignore', 'pipe' ] });
    } else if (self.isWindows()) {
      var cscriptExe = 'cscript';
      try {
        which.sync('cscript');
      } catch(e) {
        logger.debug('Could not find cscript...');
        if (os.arch() === 'ia32') {
          cscriptExe = 'c:\\windows\\system32\\cscript.exe';
        } else {
          cscriptExe = 'c:\\windows\\SysWOW64\\cscript.exe';
        }
      }
      logger.debug('cscriptExe is: ', cscriptExe);
      unzipCommand = spawn(cscriptExe, [path.join(__dirname, '..', '..', 'bin', 'unzip.vbs'), tmpZipLocation, destination ], { stdio: [ 'ignore', 'ignore', 'pipe' ] });
    }

    unzipCommand.on('error', function(err) {
      logger.error('error spawning unzip process', err);
      if (err.message.indexOf('ENOENT') !== -1) {
        return reject(new Error('Could not unzip response from Salesforce. It is likely unzip (OSX/Linux) or cscript (Windows) is not available on your system PATH. Check your local machine settings.'));
      } else {
        return reject(err);
      }
    });

    unzipCommand.stderr.on('data', function (data) {
      logger.error('ERR unzipping:');
      logger.error(data);
      if (fs.existsSync(tmpZipLocation)) {
        fs.removeAsync(tmpZipLocation)
          .then(function() {
            return reject(new Error('Could not extract and write stream to file system.'));
          })
          .catch(function(err) {
            return reject(err);
          });
      }
    });

    unzipCommand.on('close', function (code) {
      logger.debug('unzip command close', tmpZipLocation, code);
      if (fs.existsSync(tmpZipLocation)) {
        fs.removeAsync(tmpZipLocation)
          .then(function() {
            if (code !== 0) {
              return reject(new Error('Could not extract and write stream to file system. [Exit Code '+code+']'));
            } else {
              return resolve();
            }
          })
          .catch(function(err) {
            reject(err);
          });
      }
    });
  });
}

exports.unzip = function(tmpZipLocation, destination) {
  logger.debug('unzipping response via yauzl');
  return new Promise(function(resolve, reject) {
    yauzl.open(tmpZipLocation, {lazyEntries: true}, function(err, zipfile) {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', function(entry) {
        if (/\/$/.test(entry.fileName)) {
          logger.silly('zipfile directory entry:', entry);
          // directory file names end with '/'
          fs.mkdirs(path.join(destination, entry.fileName), function(err) {
            if (err) return reject(err);
            zipfile.readEntry();
          });
        } else {
          // file entry
          zipfile.openReadStream(entry, function(err, readStream) {
            logger.silly('zipfile file entry:', entry);
            if (err) return reject(err);
            // ensure parent directory exists
            fs.mkdirs(path.join(destination, path.dirname(entry.fileName)), function(err) {
              if (err) return reject(err);
              readStream.pipe(fs.createWriteStream(path.join(destination, entry.fileName)));
              readStream.on('end', function() {
                zipfile.readEntry();
              });
            });
          });
        }
      });
      zipfile.on('error', function(err) {
        logger.error('Could not unzip file via yauzl', err);
        reject(err);
      });
      zipfile.on('end', function() {
        logger.debug('File unzipped successfully');
        if (fs.existsSync(tmpZipLocation)) {
          fs.removeAsync(tmpZipLocation)
            .then(function() {
              resolve(destination);
            })
            .catch(function(err) {
              reject(err);
            });
        } else {
          resolve(destination);
        }
      });
    });
  });
};

/**
 * Writes a readable stream to disk (assumes zip)
 * We have to write the stream to the disk THEN unzip because of issues with npm's unzip
 * @param  {Stream} readableStream
 * @param  {String} destination
 * @return {Promise}
 */
exports.writeStream = function(readableStream, destination, isLegacyUnzip) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (isLegacyUnzip === undefined)
      isLegacyUnzip = false;
    var tmpZipLocation = path.join(destination, 'tmp.zip');
    try {
      logger.debug('writing zip stream to', tmpZipLocation);
      readableStream
        .pipe(fstream.Writer(tmpZipLocation))
          .on('error', function (error) {
            logger.error('error writing zip to disk', error);
            if (fs.existsSync(tmpZipLocation)) {
              fs.removeAsync(tmpZipLocation)
                .then(function() {
                  reject(error);
                })
                .catch(function(err) {
                  reject(err);
                });
            }
          })
          .on('close', function() {
            logger.debug('closed write stream, unzipping now');
            var unzipPromise = isLegacyUnzip ? self.unzipLegacy.bind(self) : self.unzip.bind(self);
            unzipPromise(tmpZipLocation, destination)
              .then(function() {
                resolve(destination);
              })
              .catch(function(err) {
                reject(err);
              });
          });
    } catch(e) {
      logger.error('error writing stream', e);
      if (fs.existsSync(tmpZipLocation)) {
        fs.removeAsync(tmpZipLocation)
          .then(function() {
            reject(e);
          })
          .catch(function(err) {
            reject(err);
          });
      }
    }
  });
};

exports.chunkArray = function(arr, chunkSize) {
  return [].concat.apply([],
    arr.map(function(elem,i) {
      return i%chunkSize ? [] : [arr.slice(i,i+chunkSize)];
    })
  );
};

exports.generateRandomString = function(length) {
  var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghiklmnopqrstuvwxyz';
  length = length ? length : 32;
  var string = '';
  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    string += chars.substring(randomNumber, randomNumber + 1);
  }
  return string;
};