var swig = require('swig');

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