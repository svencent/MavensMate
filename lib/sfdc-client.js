'use strict';
var jsforce       = require('jsforce');
var Q             = require('q');
var fs            = require('fs');
var tmp           = require('tmp');
var _             = require('lodash');
var path          = require('path');
var merge         = require('merge');
var util          = require('./util').instance;
var randomstring  = require('randomstring');
var events        = require('events');
var inherits      = require('inherits');
var Metadata      = require('./metadata');

/**
 * Represents connection to salesforce, many functions wrap jsforce
 * @param {Object} opts
 * @param {String} [opts.accessToken] - salesforce.com accesstoken
 * @param {String} [opts.username] - (optional) salesforce.com username
 * @param {String} [opts.password] - (optional) salesforce.com password
 * @param {String} [opts.securityToken] - (optional) salesforce.com security token
 * @param {String} [opts.orgType] - (optional) type of org: developer|production|sandbox|prerelease
 * @param {String} [opts.loginUrl] - Salesforce Login Server URL (e.g. https://login.salesforce.com/)
 * @param {String} [opts.instanceUrl] - Salesforce Instance URL (e.g. https://na1.salesforce.com/)
 * @param {String} [opts.serverUrl] - Salesforce SOAP service endpoint URL (e.g. https://na1.salesforce.com/services/Soap/u/28.0)
 *
 */
function SalesforceClient(opts) {
  util.applyProperties(this, opts);
  this.conn = null;
  global.logger.debug('initiating SalesforceClient', this);
}

inherits(SalesforceClient, events.EventEmitter);

SalesforceClient.prototype.getOrgType = function() {
  var validOrgTypes = ['production', 'developer', 'sandbox', 'prerelease'];
  if (this.orgType === undefined || validOrgTypes.indexOf(this.orgType) === -1) {
    return validOrgTypes[0];
  } else {
    return this.orgType;
  }
};

SalesforceClient.prototype._getLoginUrl = function() {
  if (this.loginUrl === undefined) {
    return this.loginUrl;
  } else {
    if (this.getOrgType() === 'sandbox') {
      return 'https://test.salesforce.com/';
    } else {
      return 'https://login.salesforce.com/';
    }
  }
};

/**
 * Attempts to use cached session information to initiate connection to salesforce
 * Alternatively, will perform login based on stored creds
 */
SalesforceClient.prototype.initialize = function() {
  var deferred = Q.defer();

  global.logger.debug('initializing connection to salesforce ...');

  // optionally support the ability to pass in an access token
  var accessToken = this.accessToken || undefined;
  var self = this;

  if (accessToken !== undefined && accessToken !== '') {
    self.conn = new jsforce.Connection({ accessToken: accessToken, logLevel: 'FATAL', version: global.mmApiVersion, loginUrl: self._getLoginUrl() });
    global.sfdcClient = self;
    self.conn.identity(function(err, res) {
      if (err) {
        // access token is no good, need to exlicitly login
        global.logger.debug('bad access token, resetting and performing login');
        
        self.accessToken = undefined;

        // todo: get from store
        self.username = 'mm@force.com';
        self.password = 'force';
        
        self._login()
          .then(function() {
            self._configureJsForce();
            global.sfdcClient = self;
            deferred.resolve();
          })
          ['catch'](function(error) {
            deferred.reject(error);
          })
          .done();
      } else {
        self.conn.userInfo = merge(self.conn.userInfo, res);
        global.sfdcClient = self;
        deferred.resolve(self.conn);
      }
    });
  } else {
    self._login()
      .then(function() {
        self._configureJsForce();
        global.sfdcClient = self;
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

SalesforceClient.prototype._configureJsForce = function() {
  this.conn.metadata.pollTimeout = parseInt(global.config.get('mm_timeout')) * 1000 || 20000;
};

/**
 * logs into salesforce, retrieves session id (access token)
 */
SalesforceClient.prototype._login = function() {
  var deferred = Q.defer();
  var self = this;

  self.conn = new jsforce.Connection({ logLevel: 'FATAL', version: global.mmApiVersion, loginUrl: self._getLoginUrl() });
  self.conn.login(self.username, self.password, function(err) {
    if (err) { 
      deferred.reject(err);
    } else {
      self.conn.identity(function(err, res) {
        if (err) {
          deferred.reject(err);
        } else {
          self.conn.userInfo = merge(self.conn.userInfo, res);
          global.logger.debug('logged in successfully');
          deferred.resolve(self.conn);
        }
      });
    }
  });
  return deferred.promise;
};

/**
 * Compiles files via Tooling API
 * @param  {Array of Metadata} metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
SalesforceClient.prototype.compileWithToolingApi = function(metadata) {
  var deferred = Q.defer();
  var self = this;

  global.logger.debug('compiling metadata via tooling api: '+JSON.stringify(metadata));

  _.each(metadata, function(m) {
    if (!m.isToolingType()) {
      deferred.reject('Invalid extension for tooling API compilation');
      return false;
    }
  });

  // new container
  // add member for each type
  var containerId;

  self._createContainer()
    .then(function(result) {
      containerId = result.id;
      var memberPromises = [];
      _.each(metadata, function(m) {
        memberPromises.push(self._createMember(m, containerId));
      });
      return Q.all(memberPromises);
    })
    .then(function(memberResults) {
      var isMemberSuccess = _.where(memberResults, { 'success': false }).length === 0;

      if (!isMemberSuccess) {
        return deferred.reject('Could not create tooling members: '+JSON.stringify(memberResults));
      }

      return self._createContainerAsyncRequest(containerId);
    })
    .then(function(result) {
      self._pollAsyncContainer(result.id);

      self.on('asynccontainer-complete', function(results) {
        self._deleteContainer(containerId)
          .then(function() {
            deferred.resolve(results);
          });
      });
      self.on('asynccontainer-error', function(err) {
        self._deleteContainer(containerId)
          .then(function() {
            deferred.reject(err);
          });
      });
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done();

  return deferred.promise;
};

/**
 * Compiles files via Metadata API
 * @param  {Array of Metadata} metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
SalesforceClient.prototype.compileWithMetadataApi = function(metadata) {
  var deferred = Q.defer();
  var self = this;

  global.logger.debug('compiling metadata via metadata api: '+JSON.stringify(metadata));

  Metadata.prepareDeployment(metadata)
    .then(function(zipStream) {
      process.chdir(global.project.path);
      return self.deploy(zipStream, { rollbackOnError : true });
    })
    .then(function(result) {
      global.logger.debug('Compile result: '+ JSON.stringify(result));
      deferred.resolve(result);
    })
    ['catch'](function(error) {
      deferred.reject(error);
    })
    .done(); 

  return deferred.promise;
};

/**
 * Deletes a metadata container
 *
 * @method SalesforceClient#_deleteContainer
 * @param {String} containerId - Id of metadatacontainer
 */
SalesforceClient.prototype._deleteContainer = function(containerId) {
  var deferred = Q.defer();
  var self = this;

  self.conn.tooling.sobject('MetadataContainer').delete(containerId, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

/**
 * Submits container to create containerasyncrequest
 *
 * @method SalesforceClient#_createContainerAsyncRequest
 * @param {String} containerId - Id of metadatacontainer
 */
SalesforceClient.prototype._createContainerAsyncRequest = function(containerId) {
  var deferred = Q.defer();
  var self = this;

  self.conn.tooling.sobject('ContainerAsyncRequest').create({
    IsCheckOnly: false,
    MetadataContainerId: containerId,
    IsRunTests:false
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  });
  return deferred.promise;
};

/**
 * Polling until asynccontainer is complete or error
 *
 * @method SalesforceClient#_pollAsyncContainer
 * @param {Number} interval - Polling interval in milliseconds
 * @param {Number} timeout - Polling timeout in milliseconds
 */
SalesforceClient.prototype._pollAsyncContainer = function(requestId, interval, timeout) {
  var self = this;
  var startTime = new Date().getTime();
  var poll = function() {
    var now = new Date().getTime();
    if (startTime + timeout < now) {
      self.emit('error', new Error('polling time out'));
      return;
    }
    self._getAsyncRequest(requestId).then(function(results) {
      var done = results[0].State !== 'Queued';
      if (done) {
        self.emit('asynccontainer-complete', results);
      } else {
        setTimeout(poll, interval);
      }
    }, function(err) {
      self.emit('asynccontainer-error', err);
    });
  };
  setTimeout(poll, interval);
};

SalesforceClient.prototype._getAsyncRequest = function(requestId) {
  var deferred = Q.defer();
  var self = this;

  var fields;
  if (parseInt(global.mmApiVersion) >= 31) {
    fields = ['Id', 'MetadataContainerId', 'MetadataContainerMemberId', 'State', 'IsCheckOnly', 'DeployDetails', 'ErrorMsg'];
  } else {
    fields = ['Id', 'MetadataContainerId', 'MetadataContainerMemberId', 'State', 'IsCheckOnly', 'CompilerErrors', 'ErrorMsg'];
  }

  self.conn.tooling.sobject('ContainerAsyncRequest')
    .find(
      { Id: requestId }, 
      fields
    )
    .execute(function(err, records) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(records);
      }
    });

  return deferred.promise; 
};

SalesforceClient.prototype._createContainer = function() {
  var deferred = Q.defer();
  var self = this;

  self.conn.tooling.sobject('MetadataContainer').create({
    name: randomstring.generate(32)
  }, function(err, res) {
    if (err) {
      deferred.reject('Could not create container: '+JSON.stringify(res));
    } else {
      deferred.resolve(res);
    }
  }); 

  return deferred.promise; 
};

/**
 * Creates a Tooling member for each metadata instance passed
 * @param  {Metadata} metadata - Instance of Metadata
 * @param  {String} containerId - Tooling container ID
 * @return {Promise}
 */
SalesforceClient.prototype._createMember = function(metadata, containerId) {
  var deferred = Q.defer();
  var self = this;
 
  var memberName = metadata.getType().xmlName+'Member';

  self.conn.tooling.sobject(memberName).create({
    Body: metadata.getFileBody(),
    MetadataContainerId: containerId,
    ContentEntityId: metadata.getId()
  }, function(err, res) {
    if (err) { 
      deferred.reject(err);
    } else {
      deferred.resolve(res);
    }
  }); 

  return deferred.promise; 
};

/**
 * Deploy components into an organization using zipped file representations
 *
 * @param {stream.Stream|Buffer} zipInput - Zipped file input source in readable stream or binary buffer
 * @param {Object} [options] - Options used in deployment
 * @param {Boolean} [options.allowMissingFiles] - Specifies whether a deploy succeeds even if files that are specified in package.xml but are not in the .zip file or not.
 * @param {Boolean} [options.autoUpdatePackage] - If a file is in the .zip file but not specified in package.xml, specifies whether the file should be automatically added to the package or not.
 * @param {Boolean} [options.checkOnly] - Indicates whether Apex classes and triggers are saved to the organization as part of the deployment (false) or not (true).
 * @param {Boolean} [options.ignoreWarnings] - Indicates whether a warning should allow a deployment to complete successfully (true) or not (false). Defaults to false.
 * @param {Boolean} [options.performRetrieve] - Indicates whether a retrieve() call is performed immediately after the deployment (true) or not (false).
 * @param {Boolean} [options.purgeOnDelete] - If true, the deleted components in the destructiveChanges.xml manifest file aren't stored in the Recycle Bin.
 * @param {Boolean} [options.rollbackOnError] - Indicates whether any failure causes a complete rollback (true) or not (false).
 * @param {Boolean} [options.runAllTests] - If true, all Apex tests defined in the organization are run.
 * @param {Array.<String>} [options.runTests] - A list of Apex tests to be run during deployment.
 * @param {Boolean} [options.singlePackage] - Indicates whether the specified .zip file points to a directory structure with a single package (true) or a set of packages (false).
 * @param {Callback.<Metadata~AsyncResult>} [callback] - Callback function
 * @returns {Metadata~DeployResultLocator}
 */
SalesforceClient.prototype.deploy = function(zipInput, opts) {
  var deferred = Q.defer();
  var self = this;
  
  self.conn.metadata.deploy(zipInput, opts)
    .complete(true, function(err, result) {
        if (err) { 
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

  return deferred.promise;
};

SalesforceClient.prototype.retrievePackaged = function(packageNames) {
  var deferred = Q.defer();
  var self = this;

  var r = self.conn.metadata.retrieve({ packageNames: packageNames, apiVersion: global.mmApiVersion })
    .stream()
    .pipe(fs.createWriteStream('mavensmate.zip'));

  r.on('close', function() {
    console.log('ended!');
    deferred.resolve();
  });

  return deferred.promise;
};

/**
 * Retrieves metadata from salesforce
 * @param  {Array|Object} metadataTypesOrPackage
 * @return {Promise} resolves with readable {Stream}
 */
SalesforceClient.prototype.retrieveUnpackaged = function(metadataTypesOrPackage) {
  var deferred = Q.defer();
  var self = this;
  var unpackagedTypes = [];
  
  // TODO: refactor package generation
  if (_.isArray(metadataTypesOrPackage)) {
    _.each(metadataTypesOrPackage, function(type) {
      unpackagedTypes.push({
        members: '*',
        name: type
      });
    });
  } else {
    _.forOwn(metadataTypesOrPackage, function(value, key) {
      unpackagedTypes.push({
        members: value,
        name: key
      });
    });  
  }

  var retrieveResultStream = self.conn.metadata.retrieve({ 
      unpackaged: { types : unpackagedTypes }, 
      apiVersion: global.mmApiVersion 
    })
    .stream();
  
  deferred.resolve(retrieveResultStream);

  return deferred.promise;
};

SalesforceClient.prototype.describeGlobal = function() {
  var deferred = Q.defer();
  var self = this;

  self.conn.describeGlobal(function(err, res) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(res);       
    }
  });

  return deferred.promise;
};

SalesforceClient.prototype.describe = function() {
  var deferred = Q.defer();
  var self = this;

  self.conn.metadata.describe(global.mmApiVersion, function(err, res) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(res);       
    }
  });

  return deferred.promise;
};

SalesforceClient.prototype.list = function(queries) { 
  var deferred = Q.defer();
  var self = this;

  self.conn.metadata.list(queries, function(err, res) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(res);       
    }
  });

  return deferred.promise;
};

module.exports = SalesforceClient;
