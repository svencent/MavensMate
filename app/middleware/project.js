var _       = require('lodash');
var logger  = require('winston');
var Project = require('../lib/project');
var config  = require('../config');
var util    = require('../lib/util').instance;
var path    = require('path');
var fs      = require('fs-extra');

/**
 * Middleware to attach editor and project to the request
 */
module.exports = function(req, res, next) {
  if (req.url.indexOf('/app/static') >= 0) {
    return next();
  }

  // attach project to request based on pid query param
  //
  // TODO! handle command request and app/:route/:action requests different when project is invalid
  //
  if (req.pid) {
    var project = util.getProjectById(req.app, req.pid);
    if (!project) {
      // this is a new project to the client, we attempt to initialize it
      // it's possible that:
      //   1. the pid is invalid
      //   2. the project structure is corrupt
      //   3. we are unable to initialize authentication (missing/bad tokens) --> project.requiresAuthentication
      logger.debug('Attempting to attach project to request', req.pid);
      _addProjectById(req.app, req.pid)
        .then(function() {
          project = util.getProjectById(req.app, req.pid);
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
      logger.debug('found project in cache', project.name);
      req.project = project;
      res.locals.project = project;
      next();
    }
  } else {
    next();
  }
};

function _addProjectById(app, projectId) {
  return new Promise(function(resolve, reject) {
    var projectPath = _findProjectPathById(projectId);
    if (!projectPath) {
      return reject(new Error('MavensMate could not find project with the id: '+projectId+'. This is likely because you are trying to open a project that does not reside in a valid mm_workspace. Please go to MavensMate-app global settings and ensure this project is located in a valid mm_workspace.'));
    }
    logger.info('adding project by id ----> ', projectId);
    logger.info('path: ', projectPath);
    var project = new Project({ path: projectPath });
    project.initialize(false)
      .then(function(response) {
        app.get('projects').push(project);
        resolve(response);
      })
      .catch(function(err) {
        if (err.message.indexOf('expired access/refresh token') >= 0 || err.message.indexOf('Could not retrieve credentials') >= 0) {
          logger.warn('Project requiring re-auth added to client');
          app.get('projects').push(project);
          resolve();
        } else {
          logger.error('Error initializing project: '+err.message+ ' -> '+err.stack);
          reject(err);
        }
      })
      .done();
  });
}

/**
 * Given a project id, search given workspaces to find it on the disk
 * @param  {String} id mavensmate project id
 * @return {String}    project path
 */
function _findProjectPathById(id) {
  logger.debug('_findProjectPathById');
  logger.debug(id);
  var projectPathToReturn;
  var workspaces = config.get('mm_workspace');
  if (!_.isArray(workspaces)) {
    workspaces = [workspaces];
  }
  logger.silly(workspaces);
  _.each(workspaces, function(workspacePath) {
    // /foo/bar/project
    // /foo/bar/project/config/.settings
    logger.silly(workspacePath);
    var projectPaths = util.listDirectories(workspacePath);
    logger.silly(projectPaths);
    _.each(projectPaths, function(projectPath) {
      var settingsPath = path.join(projectPath, 'config', '.settings');
      if (fs.existsSync(settingsPath)) {
        var settings = util.getFileBody(settingsPath, true);
        if (settings.id === id) {
          projectPathToReturn = projectPath;
          return false;
        }
      }
    });
  });
  return projectPathToReturn;
};