/**
 * For command-line clients, this loads all commands located in lib/commands and adds them as commander.js subcommands
 */

module.exports = function (client) {
  'use strict';

  var _       = require('lodash');
  var path    = require('path');
  var fs      = require('fs');
  var logger  = require('winston');
  var util    = require('./util').instance;

  var opts = {};
  opts.name = path.basename(process.mainModule.filename);
  opts.path = path.join(__dirname, 'commands');

  function _require(filepath) { 
    if (typeof filepath === 'string') { 
      var _f = require(filepath).addSubCommand;
      if (typeof _f === 'function') {
        _f(client);    // This adds the command to this program
      }
    }
    return client.program;
  }

  // Load tasks in a given folder.
  function _loadCmds(dirpath) {
    if (fs.existsSync(dirpath) && fs.statSync(dirpath).isDirectory()) {
      util.walk(dirpath, function(err, commandFiles) {
        _.each(commandFiles, function(filepath) {
          _require(filepath);
        });
      });

    } else {
      logger.debug('Directory not found '+dirpath);
    }

    return client.program;
  }

  if (opts.path) {
    _loadCmds(opts.path);
    var _lib = path.join(opts.path, '../'+opts.name+'.js');

    // loads parent program
    if (fs.existsSync(_lib)) {
      _require(path.join(opts.path, '../'+opts.name+'.js'));
    }
  }

};
