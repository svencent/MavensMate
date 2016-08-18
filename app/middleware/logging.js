var logger  = require('winston');
var _       = require('lodash');

module.exports = function(req, res, next) {
  if (req.url.indexOf('/app/static') === -1) {
    logger.debug('Processing request '+req.method+' for URL: '+req.url);
  } else {
    logger.silly('Processing request '+req.method+' for URL: '+req.url);
  }
  if (req.method === 'POST' && req.body) {
    logger.debug('post body', req.body);
  } else if (req.method === 'GET' && req.query && !_.isEmpty(req.query)) {
    logger.debug('query params', req.query);
  }
  next();
};