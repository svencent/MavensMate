'use strict';

var _                 = require('lodash');
var mavensmate        = require('../lib/mavensmate');
var MetadataHelper    = require('../lib/mavensmate/metadata').MetadataHelper;
var fs                = require('fs-extra');
var path              = require('path');
var Promise           = require('bluebird');
var sinon             = require('sinon');
var sinonAsPromised   = require('sinon-as-promised');
var EditorService     = require('../lib/mavensmate/editor');
var temp              = require('temp');
var TemplateService   = require('../lib/mavensmate/template');
var logger            = require('winston');
var sfdcClient        = require('./test-client');

sinonAsPromised(require('bluebird'));

exports.putTestProjectInTestWorkspace = function(testClient, name, testWorkspace) {
  var self = this;
  testWorkspace = testWorkspace || path.join(self.baseTestDirectory(),'workspace');
  if (fs.existsSync(path.join(testWorkspace, name))) {
    fs.removeSync(path.join(testWorkspace, name));
  }
  if (!fs.existsSync(path.join(testWorkspace, name))) {
    fs.copySync(path.join(self.baseTestDirectory(),'fixtures', 'test-project'), path.join(testWorkspace, name));
    var settings = fs.readJsonSync(path.join(testWorkspace, name, 'config', '.settings'));
    settings.projectName = name;
    settings.workspace = testWorkspace;
    settings.username = process.env.SALESFORCE_USERNAME || 'mm@force.com';
    settings.password = process.env.SALESFORCE_PASSWORD || 'force';
    settings.environment = process.env.SALESFORCE_ORG_TYPE || 'developer';
    fs.writeJsonSync(path.join(testWorkspace, name, 'config', '.settings'), settings);
  } 
};

exports.createClient = function(editor, settings) {
  /*jshint camelcase: false */
  var clientSettings = settings || {};
  clientSettings.mm_use_keyring = false;
  return mavensmate.createClient({
    editor: editor,
    isNodeApp: true,
    verbose: process.env.MAVENSMATE_DEBUG_TESTS === 'true' || false,
    settings: clientSettings
  });
  /*jshint camelcase: true */
};

exports.baseTestDirectory = function() {
  return __dirname;
};

exports.unlinkEditor = function() {
  try {
    sinon.stub(EditorService.prototype, 'open').returns(null);
  } catch(e) {
    if (e.message.indexOf('Attempted to wrap open which is already wrapped') === -1) {
      throw e;
    }
  }
};

exports.createProject = function(testClient, name, pkg, testWorkspace) {
  var self = this;
  self.unlinkEditor();
  return new Promise(function(resolve, reject) {
    if (!testWorkspace) {
      testWorkspace = temp.mkdirSync({ prefix: 'mm_testworkspace_' });
    } 

    var payload = {
      name: name,
      username: process.env.SALESFORCE_USERNAME || 'mm@force.com',
      password: process.env.SALESFORCE_PASSWORD || 'force',
      orgType: process.env.SALESFORCE_ORG_TYPE || 'developer',
      workspace: testWorkspace,
      package: pkg || {}
    };

    testClient.executeCommand('new-project', payload)
      .then(function(res) {
        return testClient.addProject(path.join(testWorkspace, name));
      })
      .then(function() {
        resolve(path.join(testWorkspace, name));
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.addProject = function(testClient, projectName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    testClient.addProject(path.join(self.baseTestDirectory(),'workspace', projectName), sfdcClient)
      .then(function(response) {
        resolve(response);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

exports.getProjectFiles = function(testClient, typeXmlName, numberOfFiles) {
  var metadataHelper = new MetadataHelper({ sfdcClient: testClient.getProject().sfdcClient });
  var metadataType = metadataHelper.getTypeByXmlName(typeXmlName);
  var projectPath = path.join(this.baseTestDirectory(),'workspace', testClient.getProject().name);
  var metadataDirectory = path.join(projectPath, 'src', metadataType.directoryName);
  if (!numberOfFiles) {
    numberOfFiles = 1;
  }
  var files = [];
  if (fs.existsSync(metadataDirectory)) {
    fs.readdirSync(metadataDirectory).forEach(function(filename) {
      if (files.length < numberOfFiles) {
        if (filename.indexOf('-meta.xml') === -1) {
          files.push(path.join(metadataDirectory, filename));
        }
      }
    });
  }
  return files;
};

exports.cleanUpTestProject = function(name, testWorkspace) {
  testWorkspace = testWorkspace || path.join(this.baseTestDirectory(),'workspace');
  name = name || 'existing-project';
  if (fs.existsSync(path.join(testWorkspace, name))) {
    fs.removeSync(path.join(testWorkspace, name));
  } 
};

exports.cleanUpTestData = function(testClient, paths) {
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
    testClient.executeCommand('delete-metadata', payload)
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

exports.createNewMetadata = function(testClient, typeXmlName, name, templateFileName, templateValues) {
  return new Promise(function(resolve, reject) {
    exports.getNewMetadataPayload(typeXmlName, name, templateFileName, templateValues)
      .then(function(payload) {
        return testClient.executeCommand('new-metadata', payload);
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
  res.send = function() { };
  res.locals = {};
  res.locals.project = project;
  req.project = project;
  return {
    req: req,
    res: res
  };
};