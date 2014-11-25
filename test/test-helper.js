'use strict';

var _                 = require('lodash');
var mavensmate        = require('../lib/mavensmate');
var MetadataService   = require('../lib/mavensmate/metadata').MetadataService;
var fs                = require('fs-extra');
var path              = require('path');
var Q                 = require('q');
var sinon             = require('sinon');
var EditorService     = require('../lib/mavensmate/editor');
var temp              = require('temp');
var TemplateService   = require('../lib/mavensmate/template');
var SalesforceClient  = require('../lib/mavensmate/sfdc-client');

exports.ensureTestProject = function(testClient, name, testWorkspace) {
  var self = this;
  before(function(done) {
    testWorkspace = testWorkspace || path.join(self.baseTestDirectory(),'workspace');
    if (!fs.existsSync(path.join(testWorkspace, name))) {
      fs.copySync(path.join(self.baseTestDirectory(),'fixtures', 'test-project'), path.join(testWorkspace, name));
      var settings = fs.readJsonSync(path.join(testWorkspace, name, 'config', '.settings'));
      settings.projectName = name;
      settings.workspace = testWorkspace;
      fs.writeJsonSync(path.join(testWorkspace, name, 'config', '.settings'), settings);
    } 
    done();
  });
};

exports.createClient = function(editor) {
  return mavensmate.createClient({
    editor: editor,
    headless: true,
    debugging: false,
    settings: {
      mm_use_keyring: false
    }
  });
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

exports.goOffline = function() {
  try {
    var deferred = Q.defer();
    deferred.resolve({});
    sinon.stub(SalesforceClient.prototype, 'initialize').returns(deferred.promise);
  } catch(e) {
    if (e.message.indexOf('Attempted to wrap open which is already wrapped') === -1) {
      throw e;
    }
  }  
};

exports.createProject = function(testClient, name, pkg, testWorkspace) {
  var deferred = Q.defer(); 
  this.unlinkEditor();

  if (!testWorkspace) {
    testWorkspace = temp.mkdirSync({ prefix: 'mm_testworkspace_' });
  } 

  var payload = {
    projectName: name,
    username: 'mm@force.com',
    password: 'force',
    workspace: testWorkspace,
    package: pkg || {}
  };

  testClient.executeCommand('new-project', payload, function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      testClient.setProject(path.join(testWorkspace, name), function(err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(path.join(testWorkspace, name));
        }
      });
    }
  });

  return deferred.promise;
};

exports.setProject = function(testClient, projectName, callback) {
  testClient.setProject(path.join(this.baseTestDirectory(),'workspace', projectName), function(err, response) {
    callback(err, response);
  });
};

exports.getProjectFiles = function(testClient, typeXmlName, numberOfFiles) {
  var metadataService = new MetadataService({ sfdcClient: testClient.getProject().sfdcClient });
  var metadataType = metadataService.getTypeByName(typeXmlName);
  // console.log(this.baseTestDirectory());
  // console.log(testClient.getProject());
  var projectPath = path.join(this.baseTestDirectory(),'workspace', testClient.getProject().getName());
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
  var self = this;
  after(function(done) {
    testWorkspace = testWorkspace || path.join(self.baseTestDirectory(),'workspace');
    name = name || 'existing-project';
    if (fs.existsSync(path.join(testWorkspace, name))) {
      fs.removeSync(path.join(testWorkspace, name));
    }
    done();
  }); 
};

exports.cleanUpTestData = function(testClient, files) {
  after(function(done) {
    this.timeout(20000);
    var payload = {
      files: files
    };
    testClient.executeCommand('delete-metadata', payload, function(err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });
};

exports.cleanUpWorkspace = function() {
  var unitTestProjectPath = path.join(this.baseTestDirectory(),'workspace','unittest');
  if (fs.existsSync(unitTestProjectPath)) {
    fs.removeSync(unitTestProjectPath);
  }
};

exports.createNewMetadata = function(testClient, typeXmlName, name) {
  var deferred = Q.defer();
  exports.getNewMetadataPayload(typeXmlName, name)
    .then(function(payload) {
      testClient.executeCommand('new-metadata', payload, function(err, response) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(response);
        }
      });
    })
    ['catch'](function(err) {
      deferred.reject(err);
    })
    .done();
  return deferred.promise;
};

exports.getNewMetadataPayload = function(typeXmlName, apiName, templateFileName) {
  var deferred = Q.defer();
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
      metadataType: typeXmlName, 
      params: { 'api_name': apiName }, 
      githubTemplate: template
    };
    deferred.resolve(payload);
  } else {
    var templateService = new TemplateService();
    templateService.getTemplatesForType(typeXmlName)
      .then(function(templates) {
        var template = _.find(templates, { file_name : templateFileName });
        // console.log(template);
        // console.log('\n\n\n\n');
        var payload = {
          metadataType: typeXmlName, 
          params: { 'api_name': apiName }, 
          githubTemplate: template
        };
        deferred.resolve(payload);
      })
      .done();
  }
  return deferred.promise;
};