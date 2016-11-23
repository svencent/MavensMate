'use strict';

var uuid              = require('uuid');
var _                 = require('lodash');
var config            = require('../app/config');
var logger            = require('../app/lib/logger')();
var fs                = require('fs-extra');
var path              = require('path');
var Promise           = require('bluebird');
var sinon             = require('sinon');
var sinonAsPromised   = require('sinon-as-promised');
var EditorService     = require('../app/lib/services/editor');
var TemplateService   = require('../app/lib/services/template');
var SalesforceClient  = require('../app/lib/sfdc-client');
var Project           = require('../app/lib/project');
var commandExecutor   = require('../app/lib/commands')();

sinonAsPromised(Promise);

exports.getTestCreds = function() {
  if (process.env.CIRCLECI === 'true' || process.env.CIRCLECI || process.env.CI === 'true' || process.env.CI) {
    var parallelismIndex = '0';
    try {
      parallelismIndex = process.env.PARALLELISM_INDEX || '0';
    } catch(e){}

    return {
      username: 'mm'+parallelismIndex+'@force.com',
      password: 'force',
      orgType: process.env.SALESFORCE_ORG_TYPE || 'developer'
    };
  } else {
    return {
      username: process.env.SALESFORCE_USERNAME || 'mm4@force.com',
      password: process.env.SALESFORCE_PASSWORD || 'force',
      orgType: process.env.SALESFORCE_ORG_TYPE || 'developer'
    };
  }
};

exports.putTestProjectInTestWorkspace = function(name) {
  var self = this;
  var creds = self.getTestCreds();
  var testWorkspace = path.join(self.baseTestDirectory(),'workspace');
  if (fs.existsSync(path.join(testWorkspace, name))) {
    fs.removeSync(path.join(testWorkspace, name));
  }
  if (!fs.existsSync(path.join(testWorkspace, name))) {
    fs.copySync(path.join(self.baseTestDirectory(),'fixtures', 'test-project'), path.join(testWorkspace, name));
    var settings = fs.readJsonSync(path.join(testWorkspace, name, 'config', '.settings'));
    settings.id = uuid.v1();
    settings.projectName = name;
    settings.workspace = testWorkspace;
    settings.username = creds.username;
    settings.orgType = creds.orgType;
    fs.writeJsonSync(path.join(testWorkspace, name, 'config', '.settings'), settings);

    var credentials = {};
    credentials.password = creds.password;
    fs.writeJsonSync(path.join(testWorkspace, name, 'config', '.credentials'), credentials);
  }
};

exports.bootstrapEnvironment = function() {
  logger.info('Bootstrapping test environment');
  if (process.env.PARALLELISM_INDEX)
    logger.info('CI parallelism index is: '+process.env.PARALLELISM_INDEX);
  config.set('mm_workspace', [path.join(this.baseTestDirectory(),'workspace')]);
  config.set('mm_use_keyring', false);
  process.env.mm_workspace = path.join(this.baseTestDirectory(),'workspace');
};

exports.getCommandExecutor = function(openWindowFn) {
  return require('../app/lib/commands')(openWindowFn);
};

exports.initCli = function() {
  delete require.cache[require.resolve('commander')];
  var program = require('commander');
  program
    .option('-v --verbose', 'Output logging statements')
    .option('-h --headless', 'Runs in headless (non-interactive terminal) mode. You may wish to use this flag when calling this executable from a text editor or IDE client.')
    .option('-e --editor [name]', 'Specifies the plugin client (sublime, atom)') // no default set
    .option('-p --port [number]', 'UI server port number') // (for sublime text)
    .parse(process.argv, true); // parse top-level args, defer subcommand
  program.commandExecutor = commandExecutor;
  require('../app/lib/loader')(program);
  return program;
};

exports.baseTestDirectory = function() {
  return __dirname;
};

exports.unlinkEditor = function() {
  try {
    logger.debug('unlinking editor');
    sinon.stub(EditorService.prototype, 'open').resolves(null);
  } catch(e) {
    if (e.message.indexOf('Attempted to wrap open which is already wrapped') === -1) {
      throw e;
    }
  }
};

exports.stubSalesforceClient = function(sandbox) {
  sandbox.stub(SalesforceClient.prototype, 'initialize').resolves('ok');
  sandbox.stub(SalesforceClient.prototype, 'describe').resolves([]);
  sandbox.stub(SalesforceClient.prototype, 'startSystemStreamingListener').resolves('ok');
};

exports.addProject = function(projectName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // process.env.mm_workspace = path.join(self.baseTestDirectory(),'workspace');
    var creds = self.getTestCreds();
    var sfdcClient = new SalesforceClient({
      username: creds.username,
      password: creds.password,
      orgType: creds.orgType
    });
    var project = new Project({
      path: path.join(self.baseTestDirectory(),'workspace', projectName),
      sfdcClient: sfdcClient
    });
    project.initialize(false)
      .then(function(proj) {
        resolve(proj);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.cleanUpProject = function(name, testWorkspace) {
  testWorkspace = testWorkspace || path.join(this.baseTestDirectory(),'workspace');
  name = name || 'existing-project';
  if (fs.existsSync(path.join(testWorkspace, name))) {
    fs.removeSync(path.join(testWorkspace, name));
  }
};

exports.cleanUpTestData = function(project, paths) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var pathsToDelete = [];
    _.each(paths, function(p) {
      if (fs.existsSync(p)) {
        pathsToDelete.push(p);
      }
    });
    var payload = {
      paths: pathsToDelete
    };
    var commandExecutor = self.getCommandExecutor();
    commandExecutor.execute({
        name: 'delete-metadata',
        body: payload,
        project: project
      })
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.cleanUpWorkspace = function() {
  var unitTestProjectPath = path.join(this.baseTestDirectory(),'workspace','unittest');
  if (fs.existsSync(unitTestProjectPath)) {
    fs.removeSync(unitTestProjectPath);
  }
};

exports.createNewMetadata = function(project, typeXmlName, name, templateFileName, templateValues) {
  var self = this;
  return new Promise(function(resolve, reject) {
    exports.getNewMetadataPayload(typeXmlName, name, templateFileName, templateValues)
      .then(function(payload) {
        var commandExecutor = self.getCommandExecutor();
        return commandExecutor.execute({
          name: 'new-metadata',
          body: payload,
          project: project
        });
      })
      .then(function(response) {
        logger.info('created metadata');
        logger.info(response);
        resolve(response);
      })
      .catch(function(err) {
        reject(err);
      })
      .done();
  });
};

exports.getNewMetadataPayload = function(typeXmlName, apiName, templateFileName, templateValues) {
  return new Promise(function(resolve, reject) {
    apiName = apiName || 'unittestitem';
    var template;
    if (!templateFileName) {
      template = {
        author: 'MavensMate',
        name: 'Default',
        description: 'The default template for an Apex Class',
        file_name: 'ApexClass.cls',
        params: [
          {
              default: 'MyApexClass',
              name: 'api_name',
              description: 'Apex Class API Name'
          }
        ]
      };
      var payload = {
        metadataTypeXmlName: typeXmlName,
        templateValues: templateValues || { 'api_name': apiName },
        template: template
      };
      resolve(payload);
    } else {
      var templateService = new TemplateService();
      templateService.getTemplatesForType(typeXmlName)
        .then(function(templates) {
          var template = _.find(templates, { file_name : templateFileName });
          var payload = {
            metadataTypeXmlName: typeXmlName,
            templateValues: templateValues || { 'api_name': apiName },
            template: template
          };
          resolve(payload);
        })
        .catch(function(err) {
          reject(err);
        })
        .done();
    }
  });
};

exports.mockExpress = function(project) {
  var req = {};
  var res = {};
  res.status = function() { return res; };
  res.render = function() { };
  res.redirect = function() { };
  res.send = function() { };
  res.locals = {};
  res.locals.project = project;
  req.project = project;
  return {
    req: req,
    res: res
  };
};