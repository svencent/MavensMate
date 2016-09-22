var _       = require('lodash');
var logger  = require('winston');
var Project = require('../lib/project');
var config  = require('../config');
var util    = require('../lib/util');
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
      //   3. we are unable to initialize authentication (missing/bad tokens) --> project.hasInvalidSalesforceConnection
      logger.debug('Attempting to attach project to request', req.pid);
      _addProjectById(req.app, req.pid)
        .then(function(project) {
          req.project = project;
          res.locals.project = project;
          if (project.hasInvalidSalesforceConnection) {
            logger.info('Project added to client, but it requires authentication, redirecting to auth endpoint');
            if (req.url.indexOf('/app/') >= 0 && req.url.indexOf('/auth') === -1 && req.url.indexOf('/settings') === -1) {
              // we can redirect to re-auth
              res.redirect('/app/project/'+req.pid+'/auth?pid='+req.pid);
            } else if ((req.url.indexOf('/execute') >= 0 || req.url.indexOf('/status') >= 0) && req.query.command !== 'oauth-project') {
              // this is an api (headless) request, so we need to 500
              logger.error('requested route/resource requires re-authentication, sending 500');
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
    } else if (project.hasInvalidSalesforceConnection) {
      req.project = project;
      if (req.url.indexOf('/app/') >= 0 && req.url.indexOf('/auth') === -1 && req.url.indexOf('/settings') === -1) {
        // we can redirect to re-auth
        res.redirect('/app/project/'+req.pid+'/auth?pid='+req.pid);
      } else if ((req.url.indexOf('/execute') >= 0 || req.url.indexOf('/status') >= 0) && req.query.command !== 'oauth-project') {
        // this is an api (headless) request, so we need to 500
        logger.error('requested route/resource requires re-authentication, sending 500');
        res.status(500).send('Could not complete the requested operation. Project requires re-authentication.');
      } else {
        next();
      }
    } else {
      logger.info('Project is known to the server -->', project.name);
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
      return reject(new Error('MavensMate could not find project with the id: '+projectId+'. This is likely because you are trying to open a project that does not reside in a valid mm_workspace. Please go to MavensMate Desktop global settings and ensure this project is located in a valid mm_workspace.'));
    }
    logger.info('adding project by id ---->', projectId, 'path -->', projectPath);
    var project = new Project(projectPath);
    project.initialize()
      .then(function(response) {
        if (project.hasInvalidSalesforceConnection) {
          logger.warn('Project requiring reauthentication added to server');
        }
        app.get('projects').push(project);
        resolve(project);
      })
      .catch(function(err) {
        logger.error('Could not add project', err);
        reject(err);
      });
  });
}

/**
 * Given a project id, search given workspaces to find it on the disk
 * @param  {String} id mavensmate project id
 * @return {String}    project path
 */
function _findProjectPathById(id) {
  logger.debug('_findProjectPathById', id);
  var projectPathToReturn;
  var workspaces = config.get('mm_workspace');
  if (!_.isArray(workspaces)) {
    workspaces = [workspaces];
  }
  logger.silly('workspaces', workspaces);
  _.each(workspaces, function(workspacePath) {
    logger.silly(workspacePath);
    var projectPaths = util.listDirectories(workspacePath);
    _.each(projectPaths, function(projectPath) {
      // todo: remove settingsPath (deprecated)
      var settingsPath = path.join(projectPath, 'config', '.settings');
      if (fs.existsSync(settingsPath)) {
        var settings = util.getFileBody(settingsPath, true);
        if (settings.id === id) {
          projectPathToReturn = projectPath;
          return false;
        }
      } else if (fs.existsSync(path.join(projectPath, '.mavensmate', 'project.json'))) {
        var projectJson = util.getFileBody(path.join(projectPath, '.mavensmate', 'project.json'), true);
        if (projectJson.id === id) {
          projectPathToReturn = projectPath;
          return false;
        }
      }
    });
  });
  return projectPathToReturn;
};