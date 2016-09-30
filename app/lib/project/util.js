var Promise           = require('bluebird');
var fs                = require('fs-extra-promise');
var find              = require('findit');
var path              = require('path');
var logger            = require('winston');

module.exports.copy = function(fromPath, toPath, replacePackageXml) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      if (replacePackageXml === undefined) replacePackageXml = false;
      var fileFinder = find(fromPath);
      fileFinder.on('file', function (file) {
        var fileBasename = path.basename(file);
        // file => /foo/bar/myproject/unpackaged/classes/myclass.cls
        logger.debug('refreshing file: '+file);

        var directory = path.dirname(file); //=> /foo/bar/myproject/unpackaged/classes
        var destinationDirectory = directory.replace(fromPath, toPath); //=> /foo/bar/myproject/src/classes

        // make directory if it doesnt exist (parent dirs included)
        if (!fs.existsSync(destinationDirectory)) {
          fs.mkdirpSync(destinationDirectory);
        }

        if (replacePackageXml && fileBasename === 'package.xml') {
          fs.removeSync(path.join(destinationDirectory, fileBasename));
          fs.copySync(file, path.join(destinationDirectory, fileBasename));
        } else if (fileBasename !== 'package.xml') {
          fs.removeSync(path.join(destinationDirectory, fileBasename));
          fs.copySync(file, path.join(destinationDirectory, fileBasename));
        }
      });
      fileFinder.on('end', function () {
        // if (fs.existsSync(fromPath)) {
        //   fs.removeAsync(fromPath)
        //     .then(function() {
        //       resolve();
        //     })
        //     .catch(function(err) {
        //       reject(err);
        //     });
        // } else {
        //   resolve();
        // }
        resolve();
      });
      fileFinder.on('error', function (err) {
        logger.debug('Could not process retrieved metadata: '+err.message);
        reject(err);
      });
    } catch(e) {
      reject(e);
    }
  });
};
