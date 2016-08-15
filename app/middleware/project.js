var logger = require('winston');

/**
 * Middleware to attach editor and project to the request
 */
module.exports = function(req, res, next) {
  if (req.url.indexOf('/app/static') >= 0) {
    return next();
  }

  var client = req.app.get('client');

  // attach project to request based on pid query param
  //
  // TODO! handle command request and app/:route/:action requests different when project is invalid
  //
  if (req.pid) {
    var project = client.getProjectById(req.pid);
    if (!project) {
      // this is a new project to the client, we attempt to initialize it
      // it's possible that:
      //   1. the pid is invalid
      //   2. the project structure is corrupt
      //   3. we are unable to initialize authentication (missing/bad tokens) --> project.requiresAuthentication
      logger.debug('Attempting to attach project to request', req.pid);
      client.addProjectById(req.pid)
        .then(function() {
          project = client.getProjectById(req.pid);
          req.project = project;
          res.locals.project = project;
          if (project.requiresAuthentication) {
            logger.info('Project added to client, but it requires authentication, redirecting to auth endpoint');
            if (req.url.indexOf('/app/') >= 0) {
              // we can redirect to re-auth
              res.redirect('/app/project/'+req.pid+'/auth?pid='+req.pid);
            } else if (req.url.indexOf('/execute') >= 0 || req.url.indexOf('/status') >= 0) {
              // this is an api (headless) request, so we need to 500
              res.status(500).send('Could not complete the requested operation. Project requires re-authentication.');
            } else {
              next();
            }
          } else {
            next();
          }
        })
        .catch(function(err) {
          // todo: when will this be thrown???
          // todo: redirect to friendly page on /app route
          logger.error('Failed to add project to client', err);
          res.status(500).send('Error initializing project: '+err.message);
        });
    } else if (project.requiresAuthentication) {
      req.project = project;
      if (req.url.indexOf('/app/') >= 0 && req.url.indexOf('/auth') === -1) {
        // we can redirect to re-auth
        res.redirect('/app/project/auth?pid='+req.pid);
      } else if (req.url.indexOf('/execute') >= 0) {
        // this is an api (headless) request, so we need to 500
        res.status(500).send('Could not complete the requested operation. Project requires re-authentication.');
      } else {
        next();
      }
    } else {
      req.project = project;
      res.locals.project = project;
      next();
    }
  } else {
    next();
  }
};