'use strict';
var Q                 = require('q');
var temp              = require('temp');
var _                 = require('lodash');
var swig              = require('swig');
var fs                = require('fs-extra');
var path              = require('path');
var util              = require('./util').instance;
var uuid              = require('node-uuid');
var SalesforceClient  = require('./sfdc-client');
var Metadata          = require('./metadata').Metadata;
var MetadataService   = require('./metadata').MetadataService;
var Deploy            = require('./deploy');
var xmldoc            = require('xmldoc');
var find              = require('findit');
var config            = require('./config');
var logger            = require('winston');
var IndexService      = require('./index');
var PackageService    = require('./package');
var SymbolService     = require('./symbol');
var LogService        = require('./log');
var KeychainService   = require('./keychain');

// Q.longStackSupport = true;

/**
 * Represents a MavensMate project
 *
 * @constructor
 * @param {Object} [opts] - Options used in deployment
 * @param {String} [opts.projectName] - For new projects, sets the name of the project
 * @param {String} [opts.subscription] - (optional) Specifies list of Metadata types that the project should subscribe to
 * @param {String} [opts.workspace] - (optional) For new projects, sets the workspace
 * @param {String} [opts.path] - (optional) Explicitly sets path of the project (defaults to current working directory)
 * @param {Array} [opts.packages] - List of packages
 */
function Project(opts) {
  util.applyProperties(this, opts);
  swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.join(__dirname,'templates')) });
  this.keychainService = new KeychainService();
}

Project.prototype.toString = function() {
  var self = this;
  var obj = {
    name: self.getName(),
    path: self.path,
  };
  return JSON.stringify(obj);
};

/**
 * Initializes project instance based on whether this is a new or existing project
 * @param  {Boolean} isNewProject
 * @return {Promise}
 */
Project.prototype.initialize = function(isNewProject) {
  var deferred = Q.defer();
  var self = this;

  if (isNewProject === undefined) {
    isNewProject = false;
  }

  var isExistingProject = !isNewProject; // for readability :^)

  if (isExistingProject) {  
    self._initExisting()
      .then(function() {
        deferred.resolve(self);
      })
      ['catch'](function(error) {
        deferred.reject(new Error('Could not initiate existing Project instance: '+error));
      })
      .done(); 
  }

  else if (isNewProject) {
    self._initNew()
      .then(function() {
        deferred.resolve(self);
      })
      ['catch'](function(error) {
        deferred.reject(new Error('Could not initiate new Project instance: '+error));
      })
      .done();
  }

  return deferred.promise;
};

/**
 * Initiates an existing (on disk) MavensMate project instance
 * @return {Promise}
 */
Project.prototype._initExisting = function() {
  logger.debug('initing existing project ...');

  var deferred = Q.defer();
  var self = this;

  if (!self._isValid()) {
    deferred.reject(new Error('This does not seem to be a valid MavensMate project directory.'));
  } else {
    if (self.path !== undefined) {
      self.workspace = path.dirname(self.path);
      self.projectName = path.basename(self.path);
    } else if (self.workspace !== undefined && self.projectName !== undefined) {
      self.path = path.join(self.workspace, self.projectName);
    } else {
      self.path = process.cwd();
      self.workspace = path.dirname(self.path);
      self.projectName = path.basename(self.path); 
    }

    if (!fs.existsSync(self.path)) {
      return deferred.reject(new Error('This does not seem to be a valid MavensMate project directory.'));
    }

    // self.workspace = path.dirname(self.path);
    // self.projectName = path.basename(self.path);

    // TODO: q.all or reduce
    // first order of business is to ensure we have a valid sfdc-client

    self.packageService = new PackageService({ location: path.join(self.path, 'src', 'package.xml') });

    self._getSettings()
      .then(function() {
        return self._getCachedSession(); 
      })
      .then(function(cachedSession) {
        cachedSession.username = self.settings.username;
        cachedSession.password = self.settings.password;
        cachedSession.orgType = self.settings.environment;
        self.sfdcClient = new SalesforceClient(cachedSession); 
        self.sfdcClient.on('sfdcclient-cache-refresh', function() {
          logger.debug('project caught event: sfdcclient-cache-refresh');
          self._writeSession()
            .then(self._getCachedSession())
            ['catch'](function(err) {
              logger.debug('sfdcclient-cache-refresh: could not update local session cache');
              throw new Error('Could not update local session cache: '+err);
            })
            .done();
        });
        return self.sfdcClient.initialize();
      })
      .then(function() {
        return self._getDescribe();
      })
      .then(function() {
        self.getLocalStore();
        return self._getDebug();
      })
      .then(function() {
        return self._getClientProjectSettings();
      })
      .then(function() {
        return self.getOrgMetadata();
      })
      .then(function() {
        self.logService = new LogService(self);
        self.sfdcClient.on('sfdcclient-new-log', function(message) {
          if (message.sobject && message.sobject.Id) {
            self.logService.downloadLog(message.sobject.Id)
              ['catch'](function(error) {
                logger.debug('Could not download log: '+error.message);
              })
              .done();
          }
        });
        return self.sfdcClient.startSystemStreamingListener();
      })
      .then(function() {
        deferred.resolve();
      })
      ['catch'](function(error) {
        deferred.reject(error);
      })
      .done();
  }

  return deferred.promise;
};

/**
 * Initiates a new (not yet on disk) MavensMate project instance
 * @return {Promise}
 */
Project.prototype._initNew = function() {
  var deferred = Q.defer();
  var self = this;

  if (!this.workspace) {
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
    } else {
      throw new Error('Could not set workspace for new project');
    }
    this.workspace = workspace;
  } else if (!fs.existsSync(this.workspace)) {
    fs.mkdirSync(this.workspace);
  }
  if (!this.workspace) {
    throw new Error('Could not set workspace for new project');
  }
  this.path = path.join(self.workspace, self.projectName);
  if (fs.existsSync(self.path)) {
    deferred.reject(new Error('Directory already exists!'));
  } else {
    this.id = uuid.v1();
    deferred.resolve(this.id);
  }

  return deferred.promise;
};

Project.prototype.getName = function() {
  return this.projectName;
};

Project.prototype.getWorkspace = function() {
  return this.workspace;
};

Project.prototype._isValid = function() {
  if (this.path !== undefined) {
    return fs.existsSync(path.join(this.path, 'config', '.settings'));
  } else if (this.workspace !== undefined && this.projectName !== undefined) {
    return fs.existsSync(path.join(this.workspace, this.projectName, 'config', '.settings'));
  } else {
    return fs.existsSync(path.join(process.cwd(),'config', '.settings'));
  }
};

/**
 * Performs a Salesforce.com retrieve based on the type of project being requested,
 * create necessary /config, places on the disk in the correct workspace 
 * @return {Promise}
 */
Project.prototype.retrieveAndWriteToDisk = function() {
  var deferred = Q.defer();
  var self = this;

  var fileProperties;
  if (fs.existsSync(self.path)) {
    deferred.reject(new Error('Project with this name already exists in the specified workspace.'));
  } else {
    if (!self.package) {
      // if user has not specified package, add standard developer objects to package
      self.package = [
        'ApexClass', 'ApexComponent', 'ApexPage', 'ApexTrigger', 'StaticResource'
      ];
    }
    self.sfdcClient.describe()
      .then(function(describe) {
        self.describe = describe;
        return self.sfdcClient.retrieveUnpackaged(self.package);
      })
      .then(function(retrieveResult) {
        var retrieveResultStream = retrieveResult.zipStream;
        fileProperties = retrieveResult.fileProperties;
        self.path = path.join(self.workspace, self.projectName);
        
        // make project dir, make config dir
        fs.mkdirSync(self.path);
        fs.mkdirSync(path.join(self.path, 'config'));

        // write retrieve result to file system
        return util.writeStream(retrieveResultStream, self.path);
      })
      .then(function() {
        if (fs.existsSync(path.join(self.path, 'unpackaged'))) {
          fs.renameSync(path.join(self.path, 'unpackaged'), path.join(self.path, 'src'));
        }
        // TODO: ensure packages write properly
        return self._initConfig();        
      })
      .then(function() {
        logger.debug('initing local store ... ');
        logger.debug(fileProperties);

        return self._writeLocalStore(fileProperties);
      })
      .then(function() {        
        deferred.resolve();
      })
      ['catch'](function(error) {
        // remove directory from workspace if we encounter an exception along the way
        if (fs.existsSync(self.path)) {
          fs.removeSync(self.path);
        }
        logger.debug(error.stack);
        deferred.reject(new Error('Could not retrieve and write project to file system: '+error.message));
      })
      .done();
  } 
  
  return deferred.promise;
};

/**
 * Writes config/ files
 * @return {Promise} 
 */
Project.prototype._initConfig = function() {
  var deferred = Q.defer();
  var self = this;

  var promises = [
    self._writeSettings(),
    self._writeSession(),
    self._writeDebug(),
    self._writeDescribe(),
    self._storePassword()
  ];

  Q.all(promises)
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(error) {
      deferred.reject(new Error('Could not initiate project config directory: '+error.message));
    })
    .done();

  return deferred.promise; 
};

/**
 * Reverts a project to server state based on package.xml
 * @return {Promise}
 */
Project.prototype.clean = function() {
  // TODO: implement stash!

  var deferred = Q.defer();
  var self = this;
  var fileProperties;
  self._parsePackageXml()
    .then(function(pkg) {
      logger.debug('package is: ', pkg);
      return self.sfdcClient.retrieveUnpackaged(pkg);
    })
    .then(function(retrieveResult) {
      var retrieveResultStream = retrieveResult.zipStream;
      fileProperties = retrieveResult.fileProperties;
      // todo: update local store
      return util.writeStream(retrieveResultStream, self.path);
    })
    .then(function() {
      fs.removeSync(path.join(self.path, 'src'));
      if (fs.existsSync(path.join(self.path, 'unpackaged'))) {
        fs.renameSync(path.join(self.path, 'unpackaged'), path.join(self.path, 'src'));
      }
      return self._writeLocalStore(fileProperties);
    })
    .then(function() {
      // TODO: handle packages!
      deferred.resolve();
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done(); 

  return deferred.promise;
};

/**
 * Parses package.xml to JS object
 * @return {Promise}
 */
Project.prototype._parsePackageXml = function() {
  var deferred = Q.defer();
  var pkg = {};

  fs.readFile(path.join(this.path, 'src', 'package.xml'), function(err, data) {
    if (err) {
      deferred.reject(err);
    } else {
      var sax = require('sax'),
      parser = sax.parser(true);
      var isValidPackage = true;
      parser.onerror = function (e) {
        logger.debug('Parse error: package.xml --> '+e);
        isValidPackage = false;
        parser.resume();
      };
      parser.onend = function () {
        if (!isValidPackage) {
          deferred.reject(new Error('Could not parse package.xml'));
        } else {
          var doc = new xmldoc.XmlDocument(data);
          _.each(doc.children, function(type) {
            var metadataType;
            var val = [];

            if (type.name !== 'types') {
              return;
            }
            _.each(type.children, function(node) {
              if (node.name === 'name' && node.val !== undefined) {
                metadataType = node.val;
                return false;
              }
            });
            _.each(type.children, function(node) {
              if (node.name === 'members') {
                if (node.val === '*') {
                  val = '*';
                  return false;
                } else {
                  val.push(node.val);
                }
              }
            });
            pkg[metadataType] = val;        
          });
          logger.debug('parsed package.xml to -->'+JSON.stringify(pkg));
          deferred.resolve(pkg);
        }
      };
      parser.write(data.toString().trim()).close();
    }
  }); 

  return deferred.promise;
};

/**
 * Compiles projects based on package.xml
 * @return {Promise}
 */
Project.prototype.compile = function() {
  var deferred = Q.defer();
  var self = this;

  // writes temp directory, puts zip file inside
  var newPath = temp.mkdirSync({ prefix: 'mm_' });
  fs.copy(path.join(self.path, 'src'), path.join(newPath, 'unpackaged'), function(err) {
    if (err) {
      return deferred.reject(err);
    } else {
      util.zipDirectory(path.join(newPath, 'unpackaged'), newPath)
        .then(function() {
          process.chdir(self.path);
          var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
          return self.sfdcClient.deploy(zipStream, { rollbackOnError : true });
        })
        .then(function(result) {
          deferred.resolve(result);
        })
        ['catch'](function(error) {
          deferred.reject(error);
        })
        .done(); 
    }  
  });
    
  return deferred.promise;
};

/**
 * Compiles metadata, will use metadata API or tooling API based on the metadata payload requested
 * @param  {Array} type Metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
Project.prototype.compileMetadata = function(metadata) {
  var deferred = Q.defer();
  var self = this;

  if (_.isArray(metadata) && _.isString(metadata[0])) {
    metadata = self.getMetadata(metadata);
  }

  // ensures all files are actually part of this project
  _.each(metadata, function(m) {
    if (m.getPath().indexOf(self.path) === -1) {
      throw new Error('Referenced file is not a part of this project: '+m.getPath());
    }
  });

  logger.debug('compiling metadata');
  // logger.debug(metadata);

  var shouldCompileWithToolingApi = config.get('mm_compile_with_tooling_api');
  var canCompileWithToolingApi = true;

  if (shouldCompileWithToolingApi) {
    _.each(metadata, function(m) {
      if (!m.isToolingType() || m.isMetaFile()) {
        canCompileWithToolingApi = false;
        return false;
      }
    });
  }

  if (shouldCompileWithToolingApi && canCompileWithToolingApi) {
    logger.debug('compiling via tooling api');
    self.sfdcClient.compileWithToolingApi(metadata, self)
      .then(function(result) {
        deferred.resolve(result);
      })
      ['catch'](function(error) {
        deferred.reject(error);
      })
      .done();
  } else {
    logger.debug('compiling via metadata api');
    var deploy = new Deploy({ project: self });
    deploy.compileWithMetadataApi(metadata)
      .then(function(result) {
        deferred.resolve(result);
      })
      ['catch'](function(error) {
        deferred.reject(error);
      })
      .done();
  }

  return deferred.promise;
};

/**
 * Edits project based on provided payload (should be a JSON package)
 * @param  {Object} payload
 * @return {Promise}
 */
Project.prototype.edit = function(pkg) {
  // TODO: implement stash!
  var deferred = Q.defer();
  var self = this;
  var fileProperties;
  logger.debug('requested package is: ', pkg);
  self.sfdcClient.retrieveUnpackaged(pkg)
    .then(function(retrieveResult) {
      var retrieveResultStream = retrieveResult.zipStream;
      fileProperties = retrieveResult.fileProperties;
      return util.writeStream(retrieveResultStream, self.path);
    })
    .then(function() {
      fs.removeSync(path.join(self.path, 'src'));
      if (fs.existsSync(path.join(self.path, 'unpackaged'))) {
        fs.renameSync(path.join(self.path, 'unpackaged'), path.join(self.path, 'src'));
      }
      return self._writeLocalStore(fileProperties);
    })
    .then(function() {
      // TODO: handle packages!
      deferred.resolve();
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done(); 

  return deferred.promise;
};

/**
 * Refreshes local copies of Metadata from the server
 * @param  {Array} metadata
 * @return {Promise} 
 */
Project.prototype.refreshFromServer = function(metadata) {
  // TODO: implement stash

  var deferred = Q.defer();
  var self = this;

  if (_.isArray(metadata) && _.isString(metadata[0])) {
    metadata = self.getMetadata(metadata);
  }

  logger.debug('refreshing from server');

  var metadataService = new MetadataService({ sfdcClient: self.sfdcClient });
  var metadataPayload = metadataService.objectify(metadata);
  logger.debug(metadataPayload);

  // TODO: refactor, as this pattern is used several places
  var unpackagedPath = path.join(self.workspace, self.projectName, 'unpackaged');
  if (fs.existsSync(unpackagedPath)) {
    fs.removeSync(unpackagedPath);
  }

  var fileProperties;
  var retrieveResultStream;
  self.sfdcClient.retrieveUnpackaged(metadataPayload)
    .then(function(retrieveResult) {
      retrieveResultStream = retrieveResult.zipStream;
      fileProperties = retrieveResult.fileProperties;
      return util.writeStream(retrieveResultStream, self.path);
    })
    .then(function() {
      return self.updateLocalStore(fileProperties);
    })
    .then(function() {
      // TODO: handle packaged
      var finder = find(path.join(self.path, 'unpackaged'));
      finder.on('file', function (file) { 
        var fileBasename = path.basename(file);
        if (fileBasename !== 'package.xml') {
          // file => /foo/bar/myproject/unpackaged/classes/myclass.cls

          var directory = path.dirname(file); //=> /foo/bar/myproject/unpackaged/classes
          var destinationDirectory = directory.replace(path.join(self.workspace, self.projectName, 'unpackaged'), path.join(self.workspace, self.projectName, 'src')); //=> /foo/bar/myproject/src/classes

          // make directory if it doesnt exist (parent dirs included)
          if (!fs.existsSync(destinationDirectory)) {
            fs.mkdirpSync(destinationDirectory); 
          }

          // remove project metadata, replace with recently retrieved
          fs.removeSync(path.join(destinationDirectory, fileBasename));
          fs.copySync(file, path.join(destinationDirectory, fileBasename));
        }
      });
      finder.on('end', function () {
        // remove retrieved
        // TODO: package support
        var unpackagedPath = path.join(self.workspace, self.projectName, 'unpackaged');
        if (fs.existsSync(unpackagedPath)) {
          fs.removeSync(unpackagedPath);
        }
        deferred.resolve();
      });
      finder.on('error', function (err) {
        deferred.reject(new Error('Could not process retrieved metadata: '+err.message));
      });
    })
    ['catch'](function(err) {
      // console.log(err.stack);
      deferred.reject(new Error('Could not refresh metadata: '+err.message));
    })
    .done();

  return deferred.promise;
}; 

Project.prototype.deleteFromServer = function(metadata) {
  // TODO: implement stash
  var deferred = Q.defer();
  var self = this;
  logger.debug('deleting metadata from server: '+JSON.stringify(metadata));

  if (_.isArray(metadata) && _.isString(metadata[0])) {
    metadata = self.getMetadata(metadata);
  }

  var deploy = new Deploy({ project: self });
  deploy.stageDelete(metadata)
    .then(function(zipStream) {
      process.chdir(self.path);
      return deploy.executeStream(zipStream);
    })
    .then(function(result) {
      logger.debug('Deletion result: '+ JSON.stringify(result));
      if (result.success && result.status === 'Succeeded') {
        _.each(metadata, function(m) {
          m.deleteLocally();
        });
      }
      deferred.resolve(result);
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done(); 
  return deferred.promise;
};

/**
 * Stashes project contents in a tmp directory in case operation goes wrong, so we can revert
 * @return {Promise} - resolves with {String} - location of stash
 */
Project.prototype._stash = function() {
  var deferred = Q.defer();
  var self = this;
  var newPath = temp.mkdirSync({ prefix: 'mm_' });
  self._stashPath = newPath;
  var srcPath = path.join(self.path, 'src');
  if (fs.existsSync(srcPath)) {
    fs.copySync(srcPath, newPath);
  }
  deferred.resolve();
  return deferred.promise;
};

/**
 * Removes stashed project contents
 * @return {Nothing}
 */
Project.prototype._removeStash = function() {
  if (fs.existsSync(this._stashPath)) {
    fs.removeSync(this._stashPath);
  }
};

// TODO: refers to the (optional) settings file in the project root
Project.prototype._getClientProjectSettings = function() {
  var deferred = Q.defer();
  var self = this;
  if (fs.existsSync(path.join(this.path, this.projectName+'.json'))) {
    config.file('project', path.join(this.path, this.projectName+'.json'));
    deferred.resolve('Project settings loaded.');
  } else {
    deferred.resolve('No user project settings.');
  }
  return deferred.promise;
};

Project.prototype._getCachedSession = function() {
  var deferred = Q.defer();
  var self = this;
  if (fs.existsSync(path.join(self.path, 'config', '.session'))) {
    fs.readJson(path.join(self.path, 'config', '.session'), function(err, cachedSession) {
      if (err) {
        if (err.message.indexOf('Unexpected end of input') >= 0) {
          deferred.resolve({});
        } else {
          deferred.reject(err);
        }
      } else {
        self.cachedSession = cachedSession;
        deferred.resolve(cachedSession);
      }
    });
  } else {
    deferred.resolve({});
  }
  return deferred.promise;
};

Project.prototype.getSubscription = function() {
  return this.settings.subscription;
};

/**
 * Updates project subscriptions
 * @param {String} key - setting key you'd like to override
 * @param  {Array} newSubscription - array of types ['ApexClass', 'CustomObject']
 * @return {Promise}                 [description]
 */
Project.prototype.updateSetting = function(key, value) {
  var deferred = Q.defer();
  var self = this;
  logger.debug(key);
  logger.debug(value);
  
  fs.readJson(path.join(this.path, 'config', '.settings'), function(err, settings) {
    if (err) {
      deferred.reject(err);
    } else {
      settings[key] = value;
      self.settings = settings;

      logger.debug('Updating project settings: '+JSON.stringify(settings));

      fs.outputFile(path.join(self.path, 'config', '.settings'), JSON.stringify(settings, null, 4), function(err) {
        if (err) {
          deferred.reject(err);  
        } else {
          deferred.resolve();
        }
      });
    }
  });
  return deferred.promise; 
};

Project.prototype.updateCreds = function(creds) {
  var deferred = Q.defer();
  var self = this;
  self.sfdcClient = new SalesforceClient({
    username: creds.username,
    password: creds.password,
    orgType: creds.orgType,
    loginUrl: creds.loginUrl
  }); 
  self.sfdcClient.initialize()
    .then(function() {
      return self._storePassword(creds.password);
    })
    .then(function() {
      self.sfdcClient.on('sfdcclient-cache-refresh', function() {
        self._writeSession()
          .then(self._getCachedSession())
          ['catch'](function(err) {
            throw new Error('Could not update local session cache: '+err);
          })
          .done();
        return self._writeSession();
      });
      return self._writeSession();
    })
    .then(function() {
      return self._getCachedSession();
    })
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(err) {
      deferred.reject(new Error('Could not update credentials: '+err.message));
    })
    .done();
  return deferred.promise; 
};

// retrieves settings from config/.settings
Project.prototype._getSettings = function() {
  var deferred = Q.defer();
  var self = this;
  fs.readJson(path.join(this.path, 'config', '.settings'), function(err, settings) {
    if (err) {
      deferred.reject(err);
    } else {
      self.settings = settings;
      self._getPassword()
        .then(function(pw) {
          self.settings.password = pw;
          deferred.resolve(self.settings);
        })
        ['catch'](function(err) {
          deferred.reject(new Error('Could not get project settings: '+err));
        })
        .done();
    }
  });
  return deferred.promise;
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

// retrieves describe from config/.describe
Project.prototype._getDescribe = function() {
  var deferred = Q.defer();
  var self = this;
  fs.readJson(path.join(this.path, 'config', '.describe'), function(err, describe) {
    if (err) {
      deferred.reject(err);
    } else {
      self.describe = describe;
      deferred.resolve(describe);
    }
  });
  return deferred.promise;
};

// retrieves describe from config/.describe
Project.prototype._getDebug = function() {
  var deferred = Q.defer();
  var self = this;
  fs.readJson(path.join(this.path, 'config', '.debug'), function(err, debug) {
    if (err) {
      deferred.reject(err);
    } else {
      self.debug = debug;
      deferred.resolve(debug);
    }
  });
  return deferred.promise;
};

/**
 * Indexes Apex symbols
 * @return {Promise}
 */
Project.prototype.indexSymbols = function(apexClassName) {
  var deferred = Q.defer();
  var self = this;

  if (!fs.existsSync(path.join(self.path, 'config', '.symbols'))) {
    fs.mkdirpSync(path.join(self.path, 'config', '.symbols')); 
  }

  // todo: stash existing
  var symbolService = new SymbolService(self);

  var symbolPromise = apexClassName ? symbolService.indexApexClass(apexClassName) : symbolService.index();
  symbolPromise
    .then(function() {
      logger.debug('done indexing symbols!');
      deferred.resolve();
    })
    ['catch'](function(err) {
      deferred.reject('Could not index org metadata: '+err.message);
    })
    .done();

  return deferred.promise; 
};

/**
 * Populates project's config/.org_metadata with server metadata based on the projects subscription
 * @return {Promise}
 */
Project.prototype.indexMetadata = function() {
  var deferred = Q.defer();
  var self = this;
  // todo: stash existing
  var indexService = new IndexService({ project: self });
  indexService.indexServerProperties(self.getSubscription())
    .then(function(res) {
      fs.outputFile(path.join(self.path, 'config', '.org_metadata'), JSON.stringify(res, null, 4), function(err) {
        if (err) {
          deferred.reject(err);  
        } else {
          deferred.resolve();
        }
      });
    })
    ['catch'](function(err) {
      deferred.reject('Could not index org metadata: '+err.message);
    })
    .done();

  return deferred.promise; 
};

Project.prototype.getOrgMetadata = function() {
  var deferred = Q.defer();
  var self = this;
  if (fs.existsSync(path.join(this.path, 'config', '.org_metadata'))) {
    try {
      fs.readJson(path.join(this.path, 'config', '.org_metadata'), function(err, orgMetadata) {
        if (err) {
          deferred.reject(err);
        } else {          
          self.orgMetadata = orgMetadata;

          var indexService = new IndexService({ project: self });
          var metadataService = new MetadataService({ sfdcClient: self.sfdcClient });
          self._parsePackageXml()
            .then(function(packageXml) {
              var ids = [];
              _.forOwn(packageXml, function(packageMembers, metadataTypeXmlName) {
                var metadataType = metadataService.getTypeByName(metadataTypeXmlName); //inFolder, childXmlNames
                if (_.has(metadataType, 'parentXmlName')) {
                  var parentMetadataType = metadataService.getTypeByName(metadataType.parentXmlName);
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
                    } else {
                      // id: ApexClass.MyClassName
                      ids.push([metadataTypeXmlName, member].join('.'));
                    }
                  });
                }
              });
              indexService.setChecked(orgMetadata, ids);
              deferred.resolve(orgMetadata);
            })
            ['catch'](function(err) {
              deferred.reject(new Error('Can not obtain org metadata index: '+err.message));
            })
            .done();
        }
      });
    } catch(e) {
      deferred.resolve([]);
    }
  } else {
    deferred.resolve([]);
  }
  return deferred.promise;
};

Project.prototype.hasIndexedMetadata = function() {
  return _.isArray(this.orgMetadata) && this.orgMetadata.length > 0;
};

Project.prototype.updateLocalStore = function(fileProperties) {
  var deferred = Q.defer();
  var self = this;
  if (!self.metadataService) {
    self.metadataService = new MetadataService({ sfdcClient: self.sfdcClient });
  }

  Q.when(fileProperties, function (properties) {
    if (!_.isArray(properties)) {
      properties = [properties];
    }
    try {
      var store = self.getLocalStore();
      _.each(properties, function(fp) {
        var metadataType = self.metadataService.getTypeByPath(fp.fileName.split('.')[1]);
        // console.log(metadataType);
        if (metadataType && fp.fullName.indexOf('package.xml') === -1) {
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
          deferred.reject(new Error('Could not write local store: '+err.message));  
        } else {
          deferred.resolve();
        }
      });
    } catch(e) {
      deferred.reject(new Error('Could not update local store: '+e.message));
    }
     
  });

  return deferred.promise;
};

Project.prototype._writeLocalStore = function(fileProperties) {
  var deferred = Q.defer();
  var self = this;
  self.metadataService = new MetadataService({ sfdcClient: self.sfdcClient });

  Q.when(fileProperties, function (properties) {
    try {
      if (!_.isArray(properties)) {
        properties = [properties];
      }
      logger.debug('writing local store -->');
      logger.debug(properties);
      var store = {};
      _.each(properties, function(fp) {
        // logger.debug('fileProperty:');
        // logger.debug(fp);
        var metadataType = self.metadataService.getTypeByPath(fp.fileName);
        logger.debug(metadataType);
        if (metadataType !== undefined && fp.fullName.indexOf('package.xml') === -1) {
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
          deferred.reject(new Error('Could not write local store: '+err.message));  
        } else {
          deferred.resolve();
        }
      });
    } catch(e) {
      deferred.reject(new Error('Could not initiate local store: '+e.message));  
    }
  });

  return deferred.promise;
};

Project.prototype.deleteLocalMetadata = function(metadata) {
  _.each(metadata, function(m) {
    if (fs.existsSync(m.getPath())) {
      fs.removeSync(m.getPath());
    }
    if (m.hasMetaFile()) {
      if (fs.existsSync(m.getPath()+'-meta.xml')) {
        fs.removeSync(m.getPath()+'-meta.xml');
      }  
    }
  });
};

// write cached session
Project.prototype._writeSession = function() {
  var deferred = Q.defer();
  var self = this;
  var filePath = path.join(self.path, 'config', '.session');
  
  var session = {
    accessToken: self.sfdcClient.getAccessToken(),
    instanceUrl: self.sfdcClient.conn.instanceUrl
  };

  logger.debug('writing local session');
  logger.debug(session);

  fs.outputFile(filePath, JSON.stringify(session, null, 4), function(err) {
    if (err) {
      deferred.reject(err);  
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

// writes config/.settings
Project.prototype._writeDescribe = function() {
  var deferred = Q.defer();
  var file = path.join(this.path, 'config', '.describe');
  
  this.sfdcClient.describe()
    .then(function(res) {
      fs.outputFile(file, JSON.stringify(res, null, 4), function(err) {
        if (err) {
          return deferred.reject(err);  
        } else {
          deferred.resolve();
        }
      });
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done(); 

  return deferred.promise;
};

// writes config/.settings
Project.prototype._writeSettings = function() {
  var deferred = Q.defer();
  var settings = {
    projectName: this.projectName,
    username: this.sfdcClient.getUsername(),
    id: this.id,
    namespace: this.sfdcClient.getNamespace() || '',
    environment: this.sfdcClient.getOrgType(),
    workspace: this.workspace,
    subscription: this.subscription || config.get('mm_default_subscription')
  };
  if (!this.keychainService.useSystemKeychain()) {
    settings.password = this.password;
  }
  var filePath = path.join(this.path, 'config', '.settings');
  fs.outputFile(filePath, JSON.stringify(settings, null, 4), function(err) {
    if (err) {
      deferred.reject(err);  
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

// writes config/.debug
Project.prototype._writeDebug = function() {
  var deferred = Q.defer();
  var self = this;
  
  var debug = {
    users: [self.sfdcClient.conn.userInfo.user_id],
    levels: {
        Workflow: 'INFO', 
        Callout: 'INFO', 
        System: 'DEBUG', 
        Database: 'INFO', 
        ApexCode: 'DEBUG', 
        Validation: 'INFO', 
        Visualforce: 'DEBUG'
    }, 
    expiration: 480
  };

  var filePath = path.join(this.path, 'config', '.debug');
  fs.outputFile(filePath, JSON.stringify(debug, null, 4), function(err) {
    if (err) {
      deferred.reject(err);  
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

Project.prototype._storePassword = function(pw) {
  var deferred = Q.defer();
  var self = this;
  try {
    if (self.settings && self.settings.password && pw) {
      self.updateSetting('password', pw);
      deferred.resolve();
    } else {
      if (this.keychainService.useSystemKeychain()) {
        this.keychainService.storePassword(this.id, pw || this.password);
      } else {
        this.updateSetting('password', pw || this.password);
      }
      deferred.resolve();
    }
  } catch(e) {
    deferred.reject(new Error('Could not store password: '+e.message));
  }
  return deferred.promise;
};

Project.prototype._getPassword = function() {
  var deferred = Q.defer();
  var self = this;
  try {
    // if the password is specified in config/.settings, it overrides their desire/ability to use keychain
    if (self.settings.password) {
      deferred.resolve(self.settings.password);
    } else {
      var pw;
      if (this.keychainService.useSystemKeychain()) {
        pw = this.keychainService.getPassword(this.settings.id);
        if (!pw) {
          deferred.reject(new Error('Could not retrieve password from the system keychain. If you do not wish to use the system keychain, set "mm_use_keyring" to false, then specify the org password in your project\'s config/.settings file.'));
        } else {
          deferred.resolve(pw);
        }
      } else {
        deferred.reject(new Error('No "password" property in project config/.settings file.'));
      }
    }
  } catch(e) {
    deferred.reject(new Error('Could not retrieve password: '+e.message));
  }
  return deferred.promise;
};

/**
 * Takes an array of file paths, generates Metadata instances for each (was Metadata.classify)
 * @param  {Array} files
 * @return {Array of Metadata}
 */
Project.prototype.getMetadata = function(files) {
  // TODO: handle directories, too!
  // TODO: handle folder-based metadata, like documents, templates
  // TODO: handle deeply-nested types like CustomObject/CustomField
  var metadata = [];
  var self = this;
  _.each(files, function(f) {
    metadata.push(new Metadata({ project: self, path: f }));
  });
  return metadata;
};

module.exports = Project;
