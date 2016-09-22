var _       = require('lodash');
var logger  = require('winston');

module.exports.flattenResults = function(results) {
  var result = {
    checkOnly: false,
    completedDate: '',
    createdBy: '',
    createdByName: '',
    createdDate: '',
    details:
     { componentSuccesses: [],
       runTestResult: { numFailures: '0', numTestsRun: '0', totalTime: '0.0' },
       componentFailures: []
     },
    done: false,
    id: '',
    ignoreWarnings: false,
    lastModifiedDate: '',
    numberComponentErrors: 0,
    numberComponentsDeployed: 0,
    numberComponentsTotal: 0,
    numberTestErrors: 0,
    numberTestsCompleted: 0,
    numberTestsTotal: 0,
    rollbackOnError: false,
    runTestsEnabled: 'false',
    startDate: '',
    status: '',
    success: true };

  logger.debug('flattening results: ');

  _.each(results, function(res) {
    logger.debug('compile result:');
    logger.debug(res);

    if (_.has(res, 'runTestsEnabled')) {
      // this is metadata api result
      result = res;
    } else if (_.has(res, 'hasConflict') && !res.success) {
      result.details.conflicts = res.conflicts;
      result.status = 'Conflict';
      result.success = false;
      result.done = true;
    } else if (_.isArray(res)) {
      if (!result.details.componentFailures) {
        result.details.componentFailures = [];
      }
      _.each(res, function(r) {
        if (_.has(r, 'State')) {
          // tooling result
          if (r.State === 'Completed') {
            result.numberComponentsDeployed++;
            result.details.componentSuccesses.push(r);
          } else {
            result.numberComponentErrors++;
            result.details.componentFailures.push(r);
            result.success = false;
          }
        }
      });
    }
  });

  logger.debug('compile results: ');
  logger.debug(JSON.stringify(result));
  return result;
};