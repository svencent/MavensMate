'use strict';
var Q                 = require('q');
var tmp               = require('tmp');
var _                 = require('lodash');
var swig              = require('swig');
var fs                = require('fs-extra');
var path              = require('path');
var util              = require('./util').instance;
var uuid              = require('node-uuid');
var SalesforceClient  = require('./sfdc-client');
var Metadata          = require('./metadata');
var xmldoc            = require('xmldoc');
var find              = require('findit');

Q.longStackSupport = true;

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
  swig.setDefaults({ loader: swig.loaders.fs(path.join(__dirname,'templates')) });
}

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

  var isExistingProject = !isNewProject; // for readability :)

  if (isExistingProject) {  
    if (!util.isValidProject()) {
      return deferred.reject(new Error('This does not seem to be a valid MavensMate project directory.'));
    }

    if (self.path === undefined) {
      self.path = process.cwd();
    }

    self.workspace = path.dirname(self.path);
    self.projectName = path.basename(self.path);

    // todo: q.all or reduce
    // set selfs in the various methods
    // first order of business is to ensure we have a valid sfdc-client
    self._getCachedSession()
      .then(function(cachedSession) {
        global.sfdcClient = new SalesforceClient(cachedSession); 
        return global.sfdcClient.initialize();
      })
      .then(function() {
        return self._getSettings(); 
      })
      .then(function() {
        return self._getDescribe();
      })
      .then(function() {
        return self._getLocalStore();
      })
      .then(function() {
        return self._getCachedSession();
      })
      .then(function() {
        return self._getUserProjectSettings();
      })
      .then(function() {
        deferred.resolve();
      })
      ['catch'](function(error) {
        deferred.reject(error);
      })
      .done();
  }

  else if (isNewProject) {
    
    if (this.workspace === undefined) {
      var workspace;
      var workspaceSetting = global.config.get('mm_workspace');
      if (_.isArray(workspaceSetting)) {
        workspace = workspaceSetting[0];
      } else if (_.isString(workspaceSetting)) {
        workspace = workspaceSetting;
      }
      if (!fs.existsSync(workspace)) {
        fs.mkdirSync(workspace);
      }
      this.workspace = workspace;
    } else if (!fs.existsSync(this.workspace)) {
      fs.mkdirSync(this.workspace);
    }
    this.path = path.join(self.workspace, self.projectName);
    if (fs.existsSync(self.path)) {
      deferred.reject(new Error('Directory already exists!'));
    } else {
      this.id = uuid.v1();
      deferred.resolve(this.id);
    }
  }

  return deferred.promise;
};

/**
 * Performs a Salesforce.com retrieve based on the tpye of project being requested,
 * create necessary /config, places on the disk in the correct workspace 
 * @return {Promise}
 */
Project.prototype.retrieveAndWriteToDisk = function() {
  var deferred = Q.defer();
  var self = this;

  if (fs.existsSync(self.path)) {
    return deferred.reject(new Error('Project with this name already exists in the specified workspace.'));
  } else {
    if (self.package === undefined || self.package === {}) {
      self.package = [
        'ApexClass', 'ApexComponent', 'ApexPage', 'ApexTrigger', 'StaticResource'
      ];
    }
    global.sfdcClient.retrieveUnpackaged(self.package)
      .then(function(retrieveResultStream) {
        self.path = path.join(self.workspace, self.projectName);
        fs.mkdirSync(self.path);
        fs.mkdirSync(path.join(self.path, 'config'));
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
        deferred.resolve();
      })
      ['catch'](function(error) {
        if (fs.existsSync(self.path)) {
          fs.removeSync(self.path);
        }
        deferred.reject(error);
      });
  } 
  
  return deferred.promise;
};

Project.prototype._initConfig = function() {
  var deferred = Q.defer();
  var self = this;

  var promises = [
    self._writeSettings(),
    self._writeSession(),
    self._writeDebug(),
    self._writeDescribe()
  ];

  Q.all(promises)
    .then(function() {
      deferred.resolve();
    })
    ['catch'](function(error) {
      deferred.reject(error);
    });

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

  self._parsePackageXml()
    .then(function(pkg) {
      global.logger.debug('package is: ', pkg);
      return global.sfdcClient.retrieveUnpackaged(pkg);
    })
    .then(function(retrieveResultStream) {
      return util.writeStream(retrieveResultStream, self.path);
    })
    .then(function() {
      fs.removeSync(path.join(self.path, 'src'));
      if (fs.existsSync(path.join(self.path, 'unpackaged'))) {
        fs.renameSync(path.join(self.path, 'unpackaged'), path.join(self.path, 'src'));
      }
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
        global.logger.debug('Parse error: package.xml --> '+JSON.stringify(e));
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
          global.logger.debug('parsed package.xml to -->'+JSON.stringify(pkg));
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
  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(err);
    } else {
      fs.copy(path.join(self.path, 'src'), path.join(newPath, 'unpackaged'), function(err){
        
        if (err) {
          return deferred.reject(err);
        }

        util.zipDirectory(path.join(newPath, 'unpackaged'), newPath)
          .then(function() {
            process.chdir(self.path);
            var zipStream = fs.createReadStream(path.join(newPath, 'unpackaged.zip'));
            return global.sfdcClient.deploy(zipStream, { rollbackOnError : true });
          })
          .then(function(result) {
            global.logger.debug('Compile result: ', result);
            deferred.resolve(result);
          })
          ['catch'](function(error) {
            deferred.reject(error);
          })
          .done();   
      });
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

  var shouldCompileWithToolingApi = global.config.get('mm_compile_with_tooling_api');
  var canCompileWithToolingApi = true;

  if (shouldCompileWithToolingApi) {
    _.each(metadata, function(m) {
      if (!m.isToolingType()) {
        canCompileWithToolingApi = false;
        return false;
      }
    });
  }
  
  var compilerMethod = shouldCompileWithToolingApi && canCompileWithToolingApi ? 'compileWithToolingApi' : 'compileWithMetadataApi';

  global.sfdcClient[compilerMethod](metadata)
    .then(function(result) {
      deferred.resolve(result);
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done();

  return deferred.promise;
};

/**
 * Edits project based on provided payload (should be a JSON package)
 * @param  {Object} payload
 * @return {Promise}
 */
Project.prototype.edit = function(payload) {
  var deferred = Q.defer();

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

  var metadataPayload = Metadata.objectify(metadata);
  global.logger.debug(metadataPayload);

  // TODO: refactor, as this pattern is used several places
  var unpackagedPath = path.join(self.workspace, self.projectName, 'unpackaged');
  if (fs.existsSync(unpackagedPath)) {
    fs.removeSync(unpackagedPath);
  }

  global.sfdcClient.retrieveUnpackaged(metadataPayload)
    .then(function(retrieveResultStream) {
      return util.writeStream(retrieveResultStream, global.project.path);
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
    });

  return deferred.promise;
}; 

Project.prototype.deleteFromServer = function(metadata) {
  // TODO: implement stash
  var deferred = Q.defer();

  global.logger.debug('deleting metadata from server: '+JSON.stringify(metadata));

  Metadata.prepareDelete(metadata)
    .then(function(zipStream) {
      process.chdir(global.project.path);
      return global.sfdcClient.deploy(zipStream, { rollbackOnError : true });
    })
    .then(function(result) {
      global.logger.debug('Deletion result: '+ JSON.stringify(result));
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

  tmp.dir({ prefix: 'mm_' }, function _tempDirCreated(err, newPath) {
    if (err) { 
      deferred.reject(new Error('Could not stash project: '+JSON.stringify(err)));
    } else {
      self._stashPath = newPath;
      var srcPath = path.join(self.path, 'src');
      if (fs.existsSync(srcPath)) {
        fs.copySync(srcPath, newPath);
      }
      deferred.resolve();
    }
  });
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

// TODO: bad naming, but this refers to the (optional) settings file in the project root
Project.prototype._getUserProjectSettings = function() {
  var deferred = Q.defer();
  if (fs.existsSync(path.join(this.path, this.projectName+'.json'))) {
    global.program.config.file('project', path.join(this.path, this.projectName+'.json'));
    deferred.resolve('Project settings loaded.');
  } else {
    deferred.resolve('No user project settings.');
  }
  return deferred.promise;
};

Project.prototype._getCachedSession = function() {
  var deferred = Q.defer();
  var self = this;
  fs.readJson(path.join(this.path, 'config', '.session'), function(err, cachedSession) {
    if (err) {
      deferred.reject(err);
    } else {
      self.cachedSession = cachedSession;
      self.cachedSession.accessToken = self.cachedSession.sid;
      deferred.resolve(cachedSession);
    }
  });
  return deferred.promise;
};

Project.prototype.getSubsription = function() {
  return this.settings.subscription;
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
      deferred.resolve(settings);
    }
  });
  return deferred.promise;
};

// retrieves local_store from config/.local_store
Project.prototype._getLocalStore = function() {
  var deferred = Q.defer();
  var self = this;
  fs.readJson(path.join(this.path, 'config', '.local_store'), function(err, localStore) {
    if (err) {
      deferred.reject(err);
    } else {
      self.localStore = localStore;
      deferred.resolve(localStore);
    }
  });
  return deferred.promise;
};

// retrieves describe from config/.describe
Project.prototype._getDescribe = function() {
  var deferred = Q.defer();
  fs.readJson(path.join(this.path, 'config', '.describe'), function(err, describe) {
    if (err) {
      deferred.reject(err);
    } else {
      global.describe = describe;
      deferred.resolve(describe);
    }
  });
  return deferred.promise;
};

// write cached session
Project.prototype._writeSession = function() {
  var deferred = Q.defer();
  var file = path.join(this.path, 'config', '.session');
  var fileBody = swig.renderFile('session.json', {
    metadataServerUrl: global.sfdcClient.conn.userInfo.username,
    endpoint: this.projectName,
    userId: global.sfdcClient.conn.namespace,
    serverUrl: global.sfdcClient.conn.orgType,
    token: this.workspace
  });

  fs.outputFile(file, fileBody, function(err) {
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
  
  global.sfdcClient.describe()
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
  var file = path.join(this.path, 'config', '.settings');
  var fileBody = swig.renderFile('settings.json', {
    username: global.sfdcClient.conn.userInfo.username,
    projectName: this.projectName,
    namespace: global.sfdcClient.conn.namespace,
    environment: global.sfdcClient.conn.orgType,
    workspace: this.workspace,
    id: this.id,
    subscription: this.subscription || global.config.get('mm_default_subscription')
  });

  fs.outputFile(file, fileBody, function(err) {
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
  var file = path.join(this.path, 'config', '.debug');
  var fileBody = swig.renderFile('debug.json', {
    userIds: [global.sfdcClient.conn.userInfo.user_id]
  });

  fs.outputFile(file, fileBody, function(err) {
    if (err) {
      deferred.reject(err);  
    } else {
      deferred.resolve();
    }
  });
  return deferred.promise;
};

module.exports = Project;
