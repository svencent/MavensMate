/**
 * @file Represents a local MavensMate project
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';
var Promise           = require('bluebird');
var temp              = require('temp');
var _                 = require('lodash');
var fs                = require('fs-extra-promise');
var gracefulFs        = require('graceful-fs');
var path              = require('path');
var find              = require('findit');
var util              = require('./util');
var uuid              = require('uuid');
var inherits          = require('inherits');
var events            = require('events');
var moment            = require('moment');
var SalesforceClient  = require('./sfdc-client');
var MetadataHelper    = require('./metadata').MetadataHelper;
var config            = require('../config');
var logger            = require('winston');
var normalize         = require('./utilities/normalize-object');
var IndexService      = require('./services/index');
var Package           = require('./package').Package;
var SymbolService     = require('./services/symbol');
var LogService        = require('./services/log');
var LightningService  = require('./services/lightning');
var KeychainService   = require('./services/keychain');

/**
 * Represents a MavensMate project
 *
 * @constructor
 * @param {Object} [opts] - Options used in deployment
 * @param {String} [opts.name] - For new projects, sets the name of the project
 * @param {String} [opts.subscription] - (optional) Specifies list of Metadata types that the project should subscribe to
 * @param {String} [opts.workspace] - (optional) For new projects, sets the workspace
 * @param {String} [opts.path] - (optional) Explicitly sets path of the project (defaults to current working directory)
 * @param {String} [opts.origin] - (optional) When creating a MavensMate project from an existing directory, pass the existing path as "origin"
 */
var Project = function(opts) {
  this.name = opts.name;
  this.path = opts.path;
  this.workspace = opts.workspace;
  this.subscription = opts.subscription;
  this.origin = opts.origin;
  this.username = opts.username;
  this.password = opts.password;
  this.accessToken = opts.accessToken;
  this.refreshToken = opts.refreshToken;
  this.instanceUrl = opts.instanceUrl;
  this.package = opts.package;
  this.orgType = opts.orgType;
  this.sfdcClient = opts.sfdcClient;
  this.requiresAuthentication = true;
  this.settings = {};
  this.packageXml = null;
  this.orgMetadata = null;
  this.lightningIndex = null;
  this.metadataHelper = null;
  this.keychainService = new KeychainService();
  this.logService = new LogService(this);
  this.symbolService = new SymbolService(this);
  this.lightningService = new LightningService(this);
};

inherits(Project, events.EventEmitter);

/**
 * Initializes project instance based on whether this is a new or existing project
 * @param  {Boolean} isNewProject
 * @return {Promise}
 */
Project.prototype.initialize = function(isNewProject, isExistingDirectory) {
  var self = this;

  return new Promise(function(resolve, reject) {
    isNewProject = isNewProject || false;

    if (!isNewProject) {
      self._initExisting()
        .then(function() {
          resolve(self);
        })
        .catch(function(error) {
          logger.error('Could not initiate existing Project instance: '+error.message);
          reject(error);
        })
        .done();
    } else if (isNewProject) {
      var initPromise = isExistingDirectory ? self._initNewProjectFromExistingDirectory() : self._initNew();
      initPromise
        .then(function() {
          resolve(self);
        })
        .catch(function(error) {
          logger.error('Could not initiate new Project instance: '+error.message);
          reject(error);
        })
        .done();
    }
  });
};

/**
 * Initiates an existing (on disk) MavensMate project instance
 * @return {Promise}
 */
Project.prototype._initNewProjectFromExistingDirectory = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var pkg, fileProperties;
    if (!self.workspace) {
      throw new Error('Please select a workspace for this project');
    }
    if (!self.origin) {
      throw new Error('Please select an origin for this project');
    }
    if (!fs.existsSync(path.join(self.origin, 'src'))) {
      return reject(new Error('Project must have a top-level src directory'));
    }
    if (!fs.existsSync(path.join(self.origin, 'src', 'package.xml'))) {
      return reject(new Error('Project must have a valid package.xml file located in the src directory'));
    }
    self.name = path.basename(self.origin); // set name of the project to the basename of the project's origin path

    // if they're moving the project into a workspace
    if (self.workspace !== path.dirname(self.origin)) {
      if (fs.existsSync(path.join(self.workspace, self.name))) {
        return reject(new Error('Project with this name already exists in the selected workspace'));
      } else {
        // copy non-mavensmate project to selected workspace
        fs.ensureDirSync(path.join(self.workspace, self.name));
        fs.copySync(self.origin, path.join(self.workspace, self.name));
      }
    }

    self.path = path.join(self.workspace, self.name);
    fs.ensureDirSync(path.join(self.path, 'config'));

    self.sfdcClient.describe()
      .then(function(describe) {
        self.metadataHelper = new MetadataHelper({ sfdcClient: self.sfdcClient });
        return self.setDescribe(describe);
      })
      .then(function() {
        pkg = new Package({ project: self, path: path.join(self.path, 'src', 'package.xml') });
        return pkg.init();
      })
      .then(function() {
        return self.sfdcClient.retrieveUnpackaged(pkg.subscription, true, self.path);
      })
      .then(function(retrieveResult) {
        logger.debug('retrieve result: ');
        logger.debug(retrieveResult);
        fileProperties = retrieveResult.fileProperties;
        if (fs.existsSync(path.join(self.path, 'unpackaged'))) {
          fs.removeSync(path.join(self.path, 'unpackaged'));
        }
        self.id = uuid.v1();
        return self._initConfig();
      })
      .then(function() {
        logger.debug('initiating local store');
        logger.silly(fileProperties);

        return self._writeLocalStore(fileProperties);
      })
      .then(function() {
        resolve();
      })
      .catch(function(error) {
        // remove directory from workspace if we encounter an exception along the way
        logger.error('Could not retrieve and write project to file system: '+error.message);
        logger.error(error.stack);
        if (self.origin !== path.join(self.workspace, self.name) && fs.existsSync(path.join(self.workspace, self.name))) {
          fs.removeSync(path.join(self.workspace, self.name));
        }
        reject(error);
      })
      .done();
  });
};

/**
 * Initiates an existing (on disk) MavensMate project instance
 * @return {Promise}
 */
Project.prototype._initExisting = function() {
  logger.debug('itializing existing project on the disk...');

  var self = this;

  return new Promise(function(resolve, reject) {
    if (!self._hasValidStructure()) {
      return reject(new Error('This does not seem to be a valid MavensMate project directory.'));
    }

    if (self.path) {
      self.workspace = path.dirname(self.path);
      self.name = path.basename(self.path);
    } else if (self.workspace && self.name) {
      self.path = path.join(self.workspace, self.name);
    } else {
      self.path = process.cwd();
      self.workspace = path.dirname(self.path);
      self.name = path.basename(self.path);
    }

    if (!fs.existsSync(self.path)) {
      return reject(new Error('Project path does not exist.'));
    }

    logger.debug('project name', self.name);
    logger.debug('project path', self.path);

    self.settings = self._readSettings();
    var creds = self._readCredentials();
    if (!creds.password && !creds.accessToken && !creds.refreshToken) {
      throw new Error('Could not retrieve credentials for project '+self.name);
    }
    if (!creds.password && creds.accessToken && !creds.refreshToken) {
      throw new Error('Project ('+self.name+') is using Oauth for authentication but no refresh token was found');
    }

    self.packageXml = new Package({
      project: self,
      path: path.join(self.path, 'src', 'package.xml')
    });
    self.packageXml.init()
      .then(function() {
        if (!self.sfdcClient) {
          logger.debug('Creating new sfdc client', self.settings, creds);
          if (creds.refreshToken) {
            self.sfdcClient = new SalesforceClient({
              username: self.settings.username,
              accessToken: creds.accessToken,
              refreshToken: creds.refreshToken,
              instanceUrl: self.settings.instanceUrl,
              loginUrl: self.settings.loginUrl,
              orgType: self.settings.orgType
            });
          } else {
            self.sfdcClient = new SalesforceClient({
              username: self.settings.username,
              password: creds.password,
              loginUrl: self.settings.loginUrl,
              orgType: self.settings.orgType
            });
          }
          self._listenForTokenUpdates();
        }
        return self.sfdcClient.initialize();
      })
      .then(function(res) {
        self.metadataHelper = new MetadataHelper({ sfdcClient: self.sfdcClient });
        self.getLocalStore();
        return self.getOrgMetadataIndexWithSelections();
      })
      .then(function() {
        return self._refreshDescribeFromServer();
      })
      .then(function() {
        self.sfdcClient.on('sfdcclient-new-log', function(message) {
          if (message.sobject && message.sobject.Id) {
            self.logService.downloadLog(message.sobject.Id)
              .then(function(filePath) {
                self.emit('new-log', filePath);
              })
              .catch(function(error) {
                logger.debug('Could not download log: '+error.message);
              })
              .done();
          }
        });
        return self.sfdcClient.startSystemStreamingListener();
      })
      .then(function() {
        if (!self.getDebugSettingsSync().debugLevelName) {
          return self._writeDebug();
        } else {
          return Promise.resolve();
        }
      })
      .then(function() {
        self.requiresAuthentication = false;
        resolve();
      })
      .catch(function(error) {
        logger.error(error);
        if (util.isCredentialsError(error)) {
          logger.debug('project has expired access/refresh token, marking as invalid');
          self.requiresAuthentication = true;
        }
        reject(error);
      })
      .done();
  });
};

/**
 * Initiates a new (not yet on disk) MavensMate project instance
 * @return {Promise}
 */
Project.prototype._initNew = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!self.workspace) {
      var workspace;
      var workspaceSetting = config.get('mm_workspace');
      logger.debug('Workspace not specified, retrieving base workspace: ');
      logger.debug(workspaceSetting);
      if (_.isArray(workspaceSetting)) {
        workspace = workspaceSetting[0];
      } else if (_.isString(workspaceSetting)) {
        workspace = workspaceSetting;
      }
      if (workspace && !fs.existsSync(workspace)) {
        fs.mkdirSync(workspace);
      }
      self.workspace = workspace;
      logger.debug('workspace set to: '+self.workspace);
    } else if (!fs.existsSync(self.workspace)) {
      fs.mkdirSync(self.workspace);
    }
    if (!self.workspace) {
      throw new Error('Could not set workspace for new project');
    }
    self.path = path.join(self.workspace, self.name);
    if (fs.existsSync(self.path)) {
      reject(new Error('Directory already exists!'));
    } else {
      self.id = uuid.v1();
      resolve(self.id);
    }
  });
};

/**
 * Whether this project has a valid MavensMate project structure
 * @return {Boolean}
 */
Project.prototype._hasValidStructure = function() {
  if (this.path) {
    return fs.existsSync(path.join(this.path, 'config', '.settings'));
  } else if (this.workspace && this.name) {
    return fs.existsSync(path.join(this.workspace, this.name, 'config', '.settings'));
  } else {
    return fs.existsSync(path.join(process.cwd(),'config', '.settings'));
  }
};

Project.prototype.replaceLocalFiles = function(remotePath, replacePackageXml) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var finder = find(remotePath);
    finder.on('file', function (file) {
      var fileBasename = path.basename(file);
      // file => /foo/bar/myproject/unpackaged/classes/myclass.cls
      logger.debug('refreshing file: '+file);

      var directory = path.dirname(file); //=> /foo/bar/myproject/unpackaged/classes
      var destinationDirectory = directory.replace(remotePath, path.join(self.workspace, self.name, 'src')); //=> /foo/bar/myproject/src/classes

      // make directory if it doesnt exist (parent dirs included)
      if (!fs.existsSync(destinationDirectory)) {
        fs.mkdirpSync(destinationDirectory);
      }

      // remove project metadata, replace with recently retrieved
      if (replacePackageXml && fileBasename === 'package.xml') {
        fs.removeSync(path.join(destinationDirectory, fileBasename));
        fs.copySync(file, path.join(destinationDirectory, fileBasename));
      } else if (fileBasename !== 'package.xml') {
        fs.removeSync(path.join(destinationDirectory, fileBasename));
        fs.copySync(file, path.join(destinationDirectory, fileBasename));
      }
    });
    finder.on('end', function () {
      // remove retrieved
      // TODO: package support
      if (fs.existsSync(remotePath)) {
        fs.removeAsync(remotePath)
          .then(function() {
            resolve();
          })
          .catch(function(err) {
            reject(err);
          });
      } else {
        resolve();
      }
    });
    finder.on('error', function (err) {
      logger.debug('Could not process retrieved metadata: '+err.message);
      reject(err);
    });
  });
};

/**
 * Performs a Salesforce.com retrieve based on the type of project being requested,
 * create necessary /config, places on the disk in the correct workspace
 * @return {Promise}
 */
Project.prototype.retrieveAndWriteToDisk = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var fileProperties;
    if (fs.existsSync(self.path)) {
      reject(new Error('Project with this name already exists in the specified workspace.'));
    } else {
      if (!self.package) {
        // if user has not specified package, add standard developer objects to package
        self.package = [
          'ApexClass', 'ApexComponent', 'ApexPage', 'ApexTrigger', 'StaticResource'
        ];
      }
      self.sfdcClient.describe()
        .then(function(describe) {
          return self.setDescribe(describe);
        })
        .then(function() {
          self.path = path.join(self.workspace, self.name);
          fs.mkdirSync(self.path);
          fs.mkdirSync(path.join(self.path, 'config'));
          return self.sfdcClient.retrieveUnpackaged(self.package, true, self.path);
        })
        .then(function(retrieveResult) {
          fileProperties = retrieveResult.fileProperties;
          if (fs.existsSync(path.join(self.path, 'unpackaged'))) {
            gracefulFs.rename(path.join(self.path, 'unpackaged'), path.join(self.path, 'src'), function(err, res) {
              if (err) {
                return reject(err);
              } else {
                return self._initConfig();
              }
            });
          }
        })
        .then(function() {
          logger.debug('initiating local store');
          logger.silly(fileProperties);

          return self._writeLocalStore(fileProperties);
        })
        .then(function() {
          resolve();
        })
        .catch(function(error) {
          // remove directory from workspace if we encounter an exception along the way
          logger.error('Could not retrieve and write project to file system: '+error.message);
          logger.error(error.stack);
          if (fs.existsSync(self.path)) {
            fs.removeSync(self.path);
          }
          reject(error);
        })
        .done();
    }
  });
};

/**
 * Writes config/ files
 * @return {Promise}
 */
Project.prototype._initConfig = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var settings = {
      projectName: self.name,
      username: self.sfdcClient.getUsername(),
      id: self.id,
      namespace: self.sfdcClient.getNamespace() || '',
      orgType: self.sfdcClient.getOrgType(),
      loginUrl: self.sfdcClient.getLoginUrl(),
      instanceUrl: self.sfdcClient.getInstanceUrl(),
      workspace: self.workspace,
      subscription: self.subscription || config.get('mm_default_subscription')
    };
    self.writeSettings(settings);
    self._writeCredentials();

    var promises = [
      self._writeDebug(),
      self._writeEditorSettings(),
      self._refreshDescribeFromServer(),
      self.indexLightning()
    ];

    Promise.all(promises)
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        logger.error('Could not initiate project config directory -->'+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Reverts a project to server state based on package.xml
 * TODO: handle packages!
 * @return {Promise}
 */
Project.prototype.refreshFromServer = function() {
  // TODO: implement stash!
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('refreshing project from server...');
    var retrieveResult;
    var retrievePath = temp.mkdirSync({ prefix: 'mm_' });
    self.packageXml = new Package({ project: self, path: path.join(self.path, 'src', 'package.xml') });
    self.packageXml.init()
      .then(function() {
        return self.sfdcClient.retrieveUnpackaged(self.packageXml.subscription, true, retrievePath);
      })
      .then(function(res) {
        retrieveResult = res;
        util.emptyDirectoryRecursiveSync(path.join(self.path, 'src'));
        return self.replaceLocalFiles(path.join(retrievePath, 'unpackaged'), true);
      })
      .then(function() {
        return self._writeLocalStore(retrieveResult.fileProperties);
      })
      .then(function() {
        return self.indexLightning();
      })
      .then(function() {
        util.removeEmptyDirectoriesRecursiveSync(path.join(self.path, 'src'));
        resolve();
      })
      .catch(function(err) {
        logger.error('Error refreshing project from server -->'+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Reverts a project to server state based on package.xml, also updates local metadata index and describe index
 * TODO: handle packages!
 * @return {Promise}
 */
Project.prototype.clean = function() {
  // TODO: implement stash!
  var self = this;
  return new Promise(function(resolve, reject) {
    self.refreshFromServer()
      .then(function() {
        return self._refreshDescribeFromServer();
      })
      .then(function() {
        return self.indexMetadata();
      })
      .then(function() {
        resolve();
      })
      .catch(function(err) {
        logger.error('Error cleaning project -->'+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Compiles projects based on package.xml
 * @return {Promise}
 */
Project.prototype.compile = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    // writes temp directory, puts zip file inside
    var newPath = temp.mkdirSync({ prefix: 'mm_' });
    fs.copy(path.join(self.path, 'src'), path.join(newPath, 'unpackaged'), function(err) {
      if (err) {
        return reject(err);
      } else {
        var deployResult;
        util.zipDirectory(path.join(newPath, 'unpackaged'), newPath)
          .then(function() {
            var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
            return self.sfdcClient.deploy(zipStream, { rollbackOnError : true, performRetrieve: true });
          })
          .then(function(result) {
            logger.debug('Compile result: ');
            logger.debug(result);
            deployResult = result;
            if (deployResult.details.retrieveResult) {
              return self.updateLocalStore(deployResult.details.retrieveResult.fileProperties);
            } else {
              return new Promise(function(resolve) {
                resolve();
              });
            }
          })
          .then(function() {
            resolve(deployResult);
          })
          .catch(function(error) {
            reject(error);
          })
          .done();
      }
    });
  });
};

/**
 * Edits project based on provided payload (should be a JSON package)
 * @param  {Object} payload
 * @return {Promise}
 */
Project.prototype.edit = function(pkg) {
  // TODO: implement stash!
  var self = this;
  return new Promise(function(resolve, reject) {
    var newPackage;
    logger.debug('editing project, requested package is: ', pkg);
    var retrievePath = temp.mkdirSync({ prefix: 'mm_' });
    self.sfdcClient.retrieveUnpackaged(pkg, true, retrievePath)
      .then(function(retrieveResult) {
        return self._writeLocalStore(retrieveResult.fileProperties);
      })
      .then(function() {
        // todo: in conversation with sean he noted that it would be nice to not obliterate working
        // copies of server metadata on edit-project, which this does
        // in that case, we may give the user an option of overwriting all local files or only new ones
        util.emptyDirectoryRecursiveSync(path.join(self.path, 'src'));
        return self.replaceLocalFiles(path.join(retrievePath, 'unpackaged'), true);
      })
      .then(function() {
        newPackage = new Package({ project: self, path: path.join(self.path, 'src', 'package.xml') });
        return newPackage.init();
      })
      .then(function() {
        self.packageXml = newPackage;
        util.removeEmptyDirectoriesRecursiveSync(path.join(self.path, 'src'));
        resolve();
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

/**
 * Retrieves config/.settings from the disk
 * @return {[type]} [description]
 */
Project.prototype._readSettings = function() {
  try {
    return fs.readJsonSync(path.join(this.path, 'config', '.settings'));
  } catch(err) {
    logger.error('Error reading settings -->', err);
    throw new Error('Could not read settings: '+err.message);
  }
};

/**
 * Writes settings to disk, updates local settings store
 */
Project.prototype.writeSettings = function(settings) {
  try {
    for (var key in settings) {
      this.settings[key] = settings[key];
    }
    fs.writeFileSync(path.join(this.path, 'config', '.settings'), JSON.stringify(this.settings, null, 4));
  } catch(err) {
    logger.error('Could not write settings', err);
    throw new Error('Could not write settings', err);
  }
};

// retrieves local_store from config/.local_store
Project.prototype.getLocalStore = function() {
  var localStore;
  try {
    localStore = fs.readJsonSync(path.join(this.path, 'config', '.local_store'));
  } catch(e) {
    if (e.message.indexOf('Unexpected end of input') >= 0) {
      localStore = {};
    } else {
      throw e;
    }
  }
  return localStore;
};

Project.prototype.getDebugSettingsSync = function() {
  var debugSettings;
  try {
    debugSettings = fs.readJsonSync(path.join(this.path, 'config', '.debug'));
  } catch(e) {
    if (e.message.indexOf('Unexpected end of input') >= 0) {
      debugSettings = {};
    } else {
      throw e;
    }
  }
  return debugSettings;
};

Project.prototype.setLightningIndex = function(index) {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      fs.outputFileSync(path.join(self.path, 'config', '.lightning'), JSON.stringify(index, null, 4));
      self.lightningIndex = index;
      resolve();
    } catch(err) {
      logger.error('Could not write lightning index file -->'+err.message);
      reject(err);
    }
  });
};

Project.prototype.getLightningIndexSync = function() {
  var lightningIndex;
  try {
    lightningIndex = fs.readJsonSync(path.join(this.path, 'config', '.lightning'));
  } catch(e) {
    if (e.message.indexOf('Unexpected end of input') >= 0) {
      lightningIndex = [];
    } else {
      throw e;
    }
  }
  return lightningIndex;
};

Project.prototype.getLightningIndex = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    try {
      var lightningIndex = fs.readJsonSync(path.join(self.path, 'config', '.lightning'));
      return resolve(lightningIndex);
    } catch(err) {
      logger.debug('could not get index the first time');
      logger.debug(err);
      // if err is empty/missing file, index it
      self.indexLightning()
        .then(function() {
          logger.debug('done indexing lightning, now go get it');
          var lightningIndex = fs.readJsonSync(path.join(self.path, 'config', '.lightning'));
          return resolve(lightningIndex);
        })
        .catch(function(err) {
          logger.error('Could not get lightning index -->'+err.message);
          reject(err);
        });
    }
  });
};

// retrieves describe from config/.describe
Project.prototype.getDescribe = function() {
  return this._describe;
};

Project.prototype.setDescribe = function(describe) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var describePath = path.join(self.path, 'config', '.describe');
    if (fs.existsSync(path.join(self.path, 'config'))) {
      fs.outputFile(describePath, JSON.stringify(describe, null, 4), function(err) {
        if (err) {
          return reject(err);
        } else {
          self._describe = describe;
          resolve();
        }
      });
    } else {
      self._describe = describe;
      resolve();
    }
  });
};

Project.prototype._refreshDescribeFromServer = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.sfdcClient.describe()
      .then(function(res) {
        return self.setDescribe(res);
      })
      .then(function() {
        resolve();
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

Project.prototype.indexLightning = function() {
  var self = this;
  logger.debug('indexing lightning to config/.lightning');
  return new Promise(function(resolve, reject) {
    self.lightningService.getAll()
      .then(function(res) {
        return self.setLightningIndex(res);
      })
      .then(function() {
        return resolve();
      })
      .catch(function(err) {
        if (err.message.indexOf('sObject type \'AuraDefinition\' is not supported') >= 0 || err.message.indexOf('requested resource does not exist') >= 0) {
          resolve();
        } else {
          logger.error('Could not index lightning -->'+err.message);
          reject(err);
        }
      })
      .done();
  });
};

/**
 * Indexes Apex symbols
 * @return {Promise}
 */
Project.prototype.indexSymbols = function(apexClassName) {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (!fs.existsSync(path.join(self.path, 'config', '.symbols'))) {
      fs.mkdirpSync(path.join(self.path, 'config', '.symbols'));
    }

    // todo: stash existing
    var symbolPromise = apexClassName ? self.symbolService.indexApexClass(apexClassName) : self.symbolService.index();
    symbolPromise
      .then(function() {
        logger.debug('done indexing symbols!');
        resolve();
      })
      .catch(function(err) {
        logger.error('Could not index apex symbols: '+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Populates project's config/.org_metadata with server metadata based on the projects subscription
 * @return {Promise}
 */
Project.prototype.indexMetadata = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    // todo: stash existing
    if (!self.indexService) {
      self.indexService = new IndexService({ project: self });
    }
    self.indexService.indexServerProperties(self.settings.subscription)
      .then(function(res) {
        fs.outputFile(path.join(self.path, 'config', '.org_metadata'), JSON.stringify(res, null, 4), function(err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      })
      .catch(function(err) {
        logger.error('Could not index metadataHelper: '+err.message);
        reject(err);
      })
      .done();
  });
};

Project.prototype.getOrgMetadataIndex = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    fs.readJson(path.join(self.path, 'config', '.org_metadata'), function(err, orgMetadata) {
      if (err) {
        logger.debug('Could not return org metadata: '+err.message);
        resolve([]);
      } else {
        resolve(orgMetadata);
      }
    });
  });
};

Project.prototype.getOrgMetadataIndexWithSelections = function(keyword, ids, packageXmlPath) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('getOrgMetadataIndexWithSelections, package location: ', packageXmlPath);
    if (fs.existsSync(path.join(self.path, 'config', '.org_metadata'))) {
      try {
        fs.readJson(path.join(self.path, 'config', '.org_metadata'), function(err, orgMetadata) {
          if (err) {
            reject(err);
          } else {
            self.orgMetadata = orgMetadata;
            var promise;
            var customPackage;
            if (packageXmlPath) {
              customPackage = new Package({ path: packageXmlPath });
              promise = customPackage.init();
            } else {
              promise = Promise.resolve();
            }

            promise
              .then(function() {
                if (!ids) {
                  ids = [];
                  var pkg = packageXmlPath ? customPackage : self.packageXml;
                  _.forOwn(pkg.subscription, function(packageMembers, metadataTypeXmlName) {
                    var metadataType = self.metadataHelper.getTypeByXmlName(metadataTypeXmlName); //inFolder, childXmlNames
                    if (!metadataType) {
                      return reject(new Error('Unrecognized package.xml metadata type: '+metadataTypeXmlName));
                    }
                    if (_.has(metadataType, 'parentXmlName')) {
                      var parentMetadataType = self.metadataHelper.getTypeByXmlName(metadataType.parentXmlName);
                    }
                    if (packageMembers === '*') {
                      ids.push(metadataTypeXmlName);
                      var indexedType = _.find(orgMetadata, { 'xmlName': metadataTypeXmlName });
                      if (_.has(indexedType, 'children')) {
                        _.each(indexedType.children, function(child) {
                          child.select = true;
                        });
                      }
                    } else {
                      _.each(packageMembers, function(member) {
                        if (metadataType.inFolder) {
                          // id : Document.FolderName.FileName.txt
                          ids.push([metadataTypeXmlName, member.replace(/\//, '.')].join('.'));
                        } else if (parentMetadataType) {
                          // id : CustomObject.Object_Name__c.fields.Field_Name__c
                          var id = [ parentMetadataType.xmlName, member.split('.')[0], metadataType.tagName, member.split('.')[1] ].join('.');
                          ids.push(id);
                        } else if (_.has(metadataType, 'childXmlNames')) {
                          var indexedType = _.find(orgMetadata, { 'xmlName': metadataTypeXmlName });
                          if (indexedType) {
                            var indexedNode = _.find(indexedType.children, { 'id': [metadataTypeXmlName, member].join('.')});
                            if (_.has(indexedNode, 'children')) {
                              _.each(indexedNode.children, function(child) {
                                child.select = true;
                                if (_.has(child, 'children')) {
                                  _.each(child.children, function(grandChild) {
                                    grandChild.select = true;
                                  });
                                }
                              });
                            }
                            ids.push([metadataTypeXmlName, member].join('.'));
                          }
                        } else {
                          // id: ApexClass.MyClassName
                          ids.push([metadataTypeXmlName, member].join('.'));
                        }
                      });
                    }
                  });
                }
                if (!self.indexService) {
                  self.indexService = new IndexService({ project: self });
                }
                self.indexService.setChecked(orgMetadata, ids);
                self.indexService.ensureParentsAreCheckedIfNecessary(orgMetadata);
                if (keyword) {
                  self.indexService.setVisibility(orgMetadata, keyword);
                }
                resolve(orgMetadata);
              });
          }
        });
      } catch(err) {
        logger.debug('Could not getOrgMetadataIndexWithSelections: '+err.message);
        resolve([]);
      }
    } else {
      logger.debug('org_metadata not found, returning empty array');
      resolve([]);
    }
  });
};

Project.prototype.hasIndexedMetadata = function() {
  return _.isArray(this.orgMetadata) && this.orgMetadata.length > 0;
};

Project.prototype.updateLocalStore = function(fileProperties) {
  var self = this;
  return new Promise(function(resolve, reject) {
    Promise.resolve(fileProperties).then(function (properties) {
      if (!_.isArray(properties)) {
        properties = [properties];
      }
      try {
        var store = self.getLocalStore();
        _.each(properties, function(fp) {
          if (fp.attributes) {
            fp = normalize(fp);
          }
          var metadataType;
          if (fp.type) {
            metadataType = self.metadataHelper.getTypeByXmlName(fp.type);
          } else if (fp.attributes && fp.attributes.type) {
            metadataType = self.metadataHelper.getTypeByXmlName(fp.attributes.type);
            fp.fullName = fp.name;
            fp.fileName = ['unpackaged', metadataType.directoryName, fp.name +'.'+metadataType.suffix].join('/');
            fp.createdByName = fp.createdBy.name;
            fp.lastModifiedByName = fp.lastModifiedBy.name;
            fp.manageableState = !fp.namespacePrefix ? 'unmanaged' : 'managed';
            fp.namespacePrefix = fp.namespacePrefix;
            fp.type = metadataType.xmlName;
            delete fp.createdBy;
            delete fp.lastModifiedBy;
            delete fp.attributes;
          } else {
            metadataType = self.metadataHelper.getTypeByPath(fp.fileName.split('.')[1]);
          }
          logger.debug(metadataType);
          if (metadataType && fp.attributes) {
            var key = fp.name+'.'+metadataType.suffix;
            var value = fp;
            value.mmState = 'clean';
            store[key] = value;
          } else if (metadataType && fp.fullName.indexOf('package.xml') === -1) {
            var key = fp.fullName+'.'+metadataType.suffix;
            var value = fp;
            value.mmState = 'clean';
            store[key] = value;
          } else {
            if (fp.fullName.indexOf('package.xml') === -1) {
              logger.debug('Could not determine metadata type for: '+JSON.stringify(fp));
            }
          }
        });

        var filePath = path.join(self.path, 'config', '.local_store');
        fs.outputFile(filePath, JSON.stringify(store, null, 4), function(err) {
          if (err) {
            logger.error('Could not write local store: '+err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      } catch(err) {
        logger.error('Could not update local store -->'+err.message);
        reject(err);
      }
    });
  });
};

Project.prototype._writeLocalStore = function(fileProperties) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('writing to local store');
    Promise.resolve(fileProperties)
      .then(function (properties) {
        try {
          if (!_.isArray(properties)) {
            properties = [properties];
          }
          logger.debug('writing local store...');
          logger.silly(properties);
          var store = {};
          _.each(properties, function(fp) {
            if (!self.metadataHelper) {
              self.metadataHelper = new MetadataHelper({ sfdcClient: self.sfdcClient });
            }
            var metadataType = self.metadataHelper.getTypeByPath(fp.fileName);
            logger.silly(metadataType);
            if (metadataType !== undefined && fp.fullName.indexOf('package.xml') === -1) {
              var key = fp.fullName+'.'+metadataType.suffix;
              var value = fp;
              value.mmState = 'clean';
              store[key] = value;
            } else {
              if (fp.fullName.indexOf('package.xml') === -1) {
                logger.warn('Could not determine metadata type for: '+JSON.stringify(fp));
              }
            }
          });
          var filePath = path.join(self.path, 'config', '.local_store');
          fs.outputFile(filePath, JSON.stringify(store, null, 4), function(err) {
            if (err) {
              reject(new Error('Could not write local store: '+err.message));
            } else {
              resolve();
            }
          });
        } catch(err) {
          logger.error('Could not initiate local store', err);
          reject(err);
        }
      })
      .catch(function(err) {
        logger.error('fileproperties promise rejected', err);
        reject(err);
      });
  });
};

/**
 * Updates project debug settings
 * @param {String} key - setting key you'd like to override
 * @param  {Object} value - value to override
 * @return {Promise}                 [description]
 */
Project.prototype._updateDebug = function(key, value) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('updating debug setting ['+key+']');
    logger.debug(value);

    var debug;
    try {
      debug = fs.readJsonSync(path.join(self.path, 'config', '.debug'));
    } catch(err) {
      reject(new Error('Could not read project .debug file: '+err.message));
    }

    debug[key] = value;

    logger.debug('Updating project debug: ');
    logger.debug(debug);

    try {
      fs.writeFileSync(path.join(self.path, 'config', '.debug'), JSON.stringify(debug, null, 4));
      resolve();
    } catch(err) {
      logger.error('Could not write project .debug file -->'+err.message);
      reject(err);
    }
  });
};

/**
 * Writes config/.debug to the project on creation
 * @return {Promise}
 */
Project.prototype._writeDebug = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var debug = {
      users: [self.sfdcClient.getUserId()],
      logType: 'USER_DEBUG',
      debugLevelName: 'MAVENSMATE',
      levels: {
        Workflow: 'INFO',
        Callout: 'INFO',
        System: 'DEBUG',
        Database: 'INFO',
        ApexCode: 'DEBUG',
        ApexProfiling: 'INFO',
        Validation: 'INFO',
        Visualforce: 'DEBUG'
      },
      expiration: 480
    };

    var filePath = path.join(self.path, 'config', '.debug');
    fs.outputFile(filePath, JSON.stringify(debug, null, 4), function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

/**
 * Writes editor-specific config to the project root
 * @return {Promise}
 */
Project.prototype._writeEditorSettings = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    // TODO: right now these are written to every project root, regardless of editor

    /*jshint camelcase: false */
    var sublimeSettings = {
      folders : [
        {
          "folder_exclude_patterns": [
              "config/.symbols"
          ],
          path : '.'
        }
      ],
      settings : {
        auto_complete_triggers : [
          {
              characters: '.',
              selector: 'source - comment'
          },
          {
              characters: ':',
              selector: 'text.html - comment'
          },
          {
              characters: '<',
              selector: 'text.html - comment'
          },
          {
              characters: ' ',
              selector: 'text.html - comment'
          }
        ]
      }
    };
    /*jshint camelcase: true */
    var filePath = path.join( self.path, [ self.name, 'sublime-project' ].join('.') );
    fs.outputFile(filePath, JSON.stringify(sublimeSettings, null, 4), function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });

  });
};

/**
 * Attaches listener to sfdcClient that updates the local token store on refresh
 * @return {Nothing}
 */
Project.prototype._listenForTokenUpdates = function() {
  var self = this;
  if (self.sfdcClient.listeners('token-refresh').length === 0) {
    self.sfdcClient.on('token-refresh', function() {
      logger.debug('handling sfdcClient:token-refresh');
      try {
        self._writeCredentials(true);
      } catch(err) {
        logger.error('Could not store updated credentials', err);
        throw err;
      }
    });
  }
};

/**
 * Updates local credentials (in .settings and .credentials)
 * @param  {Object} creds
 * @return {Promise}
 */
Project.prototype.updateCredentials = function(creds) {
  var self = this;
  logger.debug('updating project creds', creds);
  return new Promise(function(resolve, reject) {
    var username = creds.username || self.settings.username;
    var password = creds.password;
    var accessToken = creds.accessToken;
    var refreshToken = creds.refreshToken;
    var orgType = creds.orgType || self.settings.environment || self.settings.orgType;
    var loginUrl = creds.loginUrl || self.settings.loginUrl;
    var instanceUrl = creds.instanceUrl;
    if (username && password) {
      self.sfdcClient = new SalesforceClient({
        username: username,
        password: password,
        orgType: orgType,
        loginUrl: loginUrl,
        instanceUrl: instanceUrl
      });
    } else {
      self.sfdcClient = new SalesforceClient({
        username: username,
        accessToken: accessToken,
        refreshToken: refreshToken,
        orgType: orgType,
        loginUrl: loginUrl,
        instanceUrl: instanceUrl
      });
    }
    self.sfdcClient.initialize()
      .then(function() {
        self._writeCredentials(true);
        self.writeSettings({
          username: username,
          orgType: orgType,
          loginUrl: loginUrl,
          instanceUrl: instanceUrl
        });
        return self._updateDebug('users', [self.sfdcClient.getUserId()])
      })
      .then(function() {
        if (self.requiresAuthentication) {
          logger.debug('project required authentication, running init again');
          return self._initExisting();
        } else {
          return new Promise(function(res) { res(); });
        }
      })
      .then(function() {
        self._listenForTokenUpdates();
        resolve();
      })
      .catch(function(err) {
        logger.error('Could not update credentials -->'+err.message);
        reject(err);
      })
      .done();
  });
};

/**
 * Writes accessToken/refreshToken to either the disk or the project's config/.credentials file
 * @param  {[type]} pw      [description]
 * @param  {[type]} replace [description]
 * @return {[type]}         [description]
 */
Project.prototype._writeCredentials = function(replace) {
  var self = this;
  try {
    logger.debug('_writeCredentials');
    if (self.keychainService.useSystemKeychain()) {
      logger.debug('storing credentials in system keychain');
      var keychainAction = replace ? 'replacePassword' : 'storePassword';
      if (self.sfdcClient.password) {
        self.keychainService[keychainAction](self.id || self.settings.id, self.sfdcClient.password, 'password');
      } else {
        self.keychainService[keychainAction](self.id || self.settings.id, self.sfdcClient.accessToken, 'accessToken');
        self.keychainService[keychainAction](self.id || self.settings.id, self.sfdcClient.refreshToken, 'refreshToken');
      }
      logger.debug('removing local .credentials store if it exists');
      if (fs.existsSync(path.join(self.path, 'config', '.credentials'))) {
        fs.removeSync(path.join(self.path, 'config', '.credentials'));
      }
    } else {
      logger.debug('storing credentials in config/.credentials');
      if (self.sfdcClient.password) {
        fs.writeFileSync(path.join(self.path, 'config', '.credentials'), JSON.stringify({
          password: self.sfdcClient.password
        }, null, 4));
      } else {
        fs.writeFileSync(path.join(self.path, 'config', '.credentials'), JSON.stringify({
          accessToken: self.sfdcClient.accessToken,
          refreshToken: self.sfdcClient.refreshToken
        }, null, 4));
      }
    }
  } catch(err) {
    logger.error('Error writing credentials -->', err);
    throw new Error('Could not write credentials: '+err.message);
  }
};

/**
 * Retrieves access/refresh credentials from config/.credentials or the keychain
 * @return {Promise}
 */
Project.prototype._readCredentials = function() {
  try {
    if (fs.existsSync(path.join(this.path, 'config', '.credentials'))) {
      return fs.readJsonSync(path.join(this.path, 'config', '.credentials'));
    } else {
      return {
        accessToken: this.keychainService.getPassword(this.settings.id, 'accessToken', true),
        refreshToken: this.keychainService.getPassword(this.settings.id, 'refreshToken', true),
        password: this.keychainService.getPassword(this.settings.id, 'password', true)
      }
    }
  } catch(err) {
    logger.error('Error reading credentials -->', err);
    throw new Error('Could not read credentials for project '+this.name+': '+err.message);
  }
};

/**
 * Writes result of a SOQL query to the project's soql/ directory
 * @return {None}
 */
Project.prototype.writeSoqlResult = function(res) {
  var soqlFileName = [moment().format('YYYY-MM-DD HH-mm-ss'), 'json'].join('.');
  var filePath = path.join(this.path, 'soql', soqlFileName);
  fs.outputFileSync(filePath, JSON.stringify(res, null, 4));
  return filePath;
};

module.exports = Project;
