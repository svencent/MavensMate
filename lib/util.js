'use strict';

var fs = require('fs');
var path = require('path');

function MavensMateUtil() {}

MavensMateUtil.prototype.isValidProject = function() {
  return fs.existsSync(path.join(process.cwd(),'config', '.settings'));
};

var instance = new MavensMateUtil();
exports.instance = instance;