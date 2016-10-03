var _     = require('lodash');
var path  = require('path');
var fs    = require('fs-extra-promise');
var swig  = require('swig');
var util  = require('../util');

module.exports.renderDeployResult = function(project, targets, deployOptions, deployResult) {
  var resultHtml = swig.renderFile('views/deploy/result.html', {
    results: deployResult,
    targets: targets,
    deployOptions: deployOptions,
    project: project
  });
  return {
    html: resultHtml,
    object: deployResult
  };
};

module.exports.getNamedDeploys = function(project) {
  var namedDeployments = [];
  // this is the default deployment, based on the project's package.xml
  namedDeployments.push({
    name: 'Project package.xml',
    path: path.join(project.path, 'src', 'package.xml')
  });
  if (!fs.existsSync(path.join(project.path, 'deploy'))) {
    return namedDeployments;
  } else {
    // these are custom "named deploys"
    _.each(util.listDirectories(path.join(project.path, 'deploy')), function(savedDeployPath) {
      namedDeployments.push({
        name: path.basename(savedDeployPath),
        path: path.join(savedDeployPath, 'unpackaged', 'package.xml')
      });
    });
    return namedDeployments;
  }
};