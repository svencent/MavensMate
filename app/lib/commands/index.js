var path            = require('path');
var util            = require('../util');
var logger          = require('winston');
var _               = require('lodash');
var capitalize      = require('../utilities/capitalize');
var camelize        = require('../utilities/camelize');
var EditorService   = require('../services/editor');

var commands = {};
var cmdPath = path.join(__dirname);
var commandFiles = util.walkSync(cmdPath);
_.each(commandFiles, function(filepath) {
  commands[capitalize(camelize(path.basename(filepath).split('.')[0])+'Command')] = require(filepath).command;
});

/**
 * Responses to the client that executed the command
 * @param  {Object|String} res   - response from the command
 * @param  {Boolean} success - whether the command was successfull (TODO: do we need this?)
 * @param  {Error} error   - error instance (for failed commands)
 * @return {String|Object|STDOUT}         - depends on the configuration of the client (more documentation needed here)
 */
function _handleCommandResult(result) {
  // if we're running via the cli, we can print human-friendly responses
  // otherwise we return proper JSON
  logger.info('handling command result');
  if (result.result) {
    logger.debug(result.result);
  } else if (result.error) {
    logger.error(result.error);
  }

  if (result.error) {
    if (process.env.MAVENSMATE_CONTEXT !== 'cli') {
      result.reject(result.error);
    } else {
      console.error(JSON.stringify({
        error:result.error.message
      }));
      process.exit(1);
    }
  } else {
    if (_.isString(result.result)) {
      var response = {
        message: result.result
      };
      if (process.env.MAVENSMATE_CONTEXT !== 'cli') {
        result.resolve(response);
      } else {
        console.log(JSON.stringify(response));
        process.exit(0);
      }
    } else {
      if (process.env.MAVENSMATE_CONTEXT !== 'cli') {
        result.resolve(result.result);
      } else {
        console.log(JSON.stringify(result.result));
        process.exit(0);
      }
    }
  }
};

/**
 * Command executor
 * @param  {Object} opts
 * @param  {Function} opts.openWindowFn - js function used to open a UI
 * @param  {Function} opts.project - project instance (used by the cli)
 * @return {Function}
 */
module.exports = function(opts) {

  opts = opts || {};

  return {
    /**
     * Executes a command
     * @param  {Object}   payload - object containing the following:
     * @param  {String}   payload.name  - name of the command, e.g. new-project
     * @param  {String}   payload.body  - arbitrary body of the command, e.g. { username: foo, password: bar } }
     * @param  {String}   payload.project  - project instance or project id
     * @param  {String}   payload.editor  - name of the editor, e.g. sublime, vscode, atom
     * @param  {Function} payload.callback - callback, will be called when command finishes executing
     * @return {Nothing}
     */
    execute: function(payload) {
      return new Promise(function(resolve, reject) {
        try {
          logger.info('\n\n==================> executing command');
          // logger.silly('payload ', payload);

          var name, body, editor, project, openWindowFn, commandClassName;
          name = payload.name;
          body = payload.body;
          editor = payload.editor || process.env.MAVENSMATE_EDITOR;
          project = payload.project || opts.project;
          openWindowFn = payload.openWindowFn || opts.openWindowFn;

          // if we're in cli mode and our project has expired creds, we intercept the command and send them to authenticate
          if (process.env.MAVENSMATE_CONTEXT === 'cli' && project && project.requiresAuthentication) {
            name = 'oauth-project';
          }

          commandClassName = capitalize(camelize(name))+'Command'; // => new-project -> NewProjectCommand

          var editorService = new EditorService(editor, openWindowFn);

          var command = new commands[commandClassName](project, body, editorService);

          logger.info('name: ', name);
          logger.info('project: ', project && project.name ? project.name : 'none');
          logger.info('body: ', JSON.stringify(body));
          logger.info('editor: ', editor || 'none');
          logger.debug('mavensmate command class name: '+commandClassName);
          logger.silly('mavensmate command instance: ', command);

          if (!commands[commandClassName]) {
            _handleCommandResult({
              error: new Error('Command not supported: '+name),
              resolve: resolve,
              reject: reject
            });
            return;
          }

          command.execute()
            .then(function(result) {
              _handleCommandResult({
                result: result,
                resolve: resolve,
                reject: reject
              });
            })
            .catch(function(error) {
              _handleCommandResult({
                error: error,
                resolve: resolve,
                reject: reject
              });
            });
        } catch(e) {
          logger.error(e);
          _handleCommandResult(e);
        }
      });
    }
  }
}