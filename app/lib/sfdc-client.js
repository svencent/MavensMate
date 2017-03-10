/**
 * @file Represents connection to salesforce, many functions wrap jsforce
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var jsforce       = require('jsforce');
var Promise       = require('bluebird');
var fs            = require('fs');
var _             = require('lodash');
var merge         = require('merge');
var util          = require('./util');
var events        = require('events');
var inherits      = require('inherits');
var stream        = require('stream');
var Stream        = stream.Stream;
var logger        = require('winston');
var config        = require('../config');

/**
 * @param {Object} opts
 * @param {String} [opts.accessToken] - salesforce.com accesstoken
 * @param {String} [opts.refreshToken] - salesforce.com refreshToken
 * @param {String} [opts.instanceUrl] - Salesforce Instance URL (e.g. https://na1.salesforce.com/)
 * @param {String} [opts.username] - (optional) salesforce.com username
 * @param {String} [opts.password] - (optional) salesforce.com password (append security token)
 * @param {String} [opts.orgType] - (optional) type of org: developer|production|sandbox|prerelease
 * @param {String} [opts.loginUrl] - Salesforce Login Server URL (e.g. https://login.salesforce.com/)
 * @param {String} [opts.serverUrl] - Salesforce SOAP service endpoint URL (e.g. https://na1.salesforce.com/services/Soap/u/28.0)
 * @param {String} [opts.logger] - Logger instance
 *
 */
function SalesforceClient(opts) {
  util.applyProperties(this, opts);
  this.apiVersion = config.get('mm_api_version') || '36.0';
  this.clientId = process.env.SFDC_OAUTH_CLIENT_ID || '3MVG9uudbyLbNPZP7kLgoRiWVRqiN8gFcKwdAlztVnjgbj9shSk1vMXJNmV7W0ciFbeYiaP9D4tLfBBD06l_7'
  this.callbackUrl = process.env.SFDC_OAUTH_CALLBACK_URL || 'https://localhost:56248/sfdc/auth/callback'
  logger.debug('initiating SalesforceClient: ');
}

inherits(SalesforceClient, events.EventEmitter);

/**
 * We need to manually post to the refresh token endpoint bc jsforce requires a client secret
 * @return Nothing
 */
SalesforceClient.prototype._refreshFn = function(conn, callback) {
  logger.debug('jsforce calling MavensMate _refreshFn delegate', conn);
  logger.debug('manually refreshing access token...');
  // danger: private jsforce api
  conn.oauth2._postParams({
    grant_type : 'refresh_token',
    refresh_token : conn.refreshToken,
    client_id : conn.oauth2.clientId,
  }, function(err, res) {
    if (err) {
      logger.error('_refreshFn error', err);
      callback(err);
    } else {
      logger.debug('_refreshFn result', res);
      callback(null, res.access_token, res);
    }
  });
};


/**
 * When refreshToken is used to get a new access token, we handle the event here
 * @return {Nothing}
 */
SalesforceClient.prototype._initWebServerRefreshHandler = function() {
  var self = this;
  // jsforce connection emits 'refresh' when token is refreshed in http-api.js
  self.conn.on('refresh', function(accessToken, res) {
    logger.debug('connection refresh event...', accessToken, res, self);
    self.accessToken = accessToken;
    self.instanceUrl = res.instance_url;
    self.conn.identity(function(err, res) {
      if (err) {
        logger.error('could not retrieve sfdc connection identity after token refresh');
      } else {
        try {
          self.conn.userInfo = merge(self.conn.userInfo, res);
          self.startSystemStreamingListener()
            .then(function() {
              logger.debug('restarted streaming listener for sfdc client');
            })
            .catch(function(err) {
              logger.error('Could not start streaming listener after sfdc client refresh', err);
            });
        } catch(e) {
          logger.error('could not merge user info after conn refresh');
        }
      }
      self.emit('token-refresh', self);
    });
  });
};

/**
 * When we get a new access token via username/password flow, we handle the refresh event here
 * @return {Nothing}
 */
SalesforceClient.prototype._initUsernamePasswordRefreshHandler = function() {
  var self = this;
  self.conn.on('refresh', function(accessToken, res) {
    self.accessToken = accessToken;
    self.conn.identity(function(err, res) {
      if (err) {
        logger.error('could not retrieve sfdc connection identity');
      } else {
        try {
          self.conn.userInfo = merge(self.conn.userInfo, res);
          self.startSystemStreamingListener()
            .then(function() {
              logger.debug('restarted streaming listener for sfdc client');
            })
            .catch(function(err) {
              logger.error('Could not start streaming listener after sfdc client refresh', err);
            });
        } catch(e) {
          logger.error('could not merge user info after conn refresh');
        }
      }
      self.emit('token-refresh', self);
    });
  });
};

/**
 * Attempts to use cached session information to initiate connection to salesforce
 * Alternatively, will perform login based on stored creds
 */
SalesforceClient.prototype.initialize = function() {
  var self = this;
  // TODO: refactor un/pw vs oauth flows bc they're very similar
  return new Promise(function(resolve, reject) {
    if (self.initialized) {
      return resolve();
    }
    logger.debug('initializing connection to salesforce ...', self);
    if (self.accessToken && self.instanceUrl && self.transient) {
      self.conn = new jsforce.Connection({
        logLevel: config.get('mm_sfdc_api_log_level') || 'FATAL',
        version: self.apiVersion,
        instanceUrl: self.instanceUrl || 'https://na1.salesforce.com',
        accessToken: self.accessToken
      });
      self._configureJsForce();
      self.describe()
        .then(function() {
          self.initialized = true;
          resolve();
        })
        .catch(function(error) {
          reject(error);
        })
        .done();
    } else if (self.accessToken && self.refreshToken) {
      self.conn = new jsforce.Connection({
        oauth2: {
          clientId : self.clientId,
          redirectUri : self.callbackUrl,
          loginUrl: self.instanceUrl
        },
        refreshFn: self._refreshFn,
        instanceUrl: self.instanceUrl || 'https://na1.salesforce.com',
        accessToken: self.accessToken,
        refreshToken: self.refreshToken,
        logLevel: config.get('mm_sfdc_api_log_level') || 'FATAL',
        version: self.apiVersion
      });
      self._initWebServerRefreshHandler();
      logger.silly('initialized connection', self.conn);
      self.conn.identity()
        .then(function(res) {
          self.conn.userInfo = merge(self.conn.userInfo, res);
          self._configureJsForce();
          return self.describe();
        })
        .then(function(res) {
          self.initialized = true;
          resolve(self.conn);
        })
        .catch(function(err) {
          logger.error(err);
          reject(err);
        });
    } else if (self.username && self.password) {
      logger.debug('logging in to salesforce via username/password flow: '+self.getLoginUrl());
      self.conn = new jsforce.Connection({
        oauth2: {
          clientId : self.clientId,
          redirectUri : self.callbackUrl
        },
        logLevel: config.get('mm_sfdc_api_log_level') || 'FATAL',
        version: self.apiVersion,
        loginUrl: self.getLoginUrl()
      });
      self._initUsernamePasswordRefreshHandler();
      self.conn.login(self.username, self.password)
        .then(function(res) {
          return self.conn.identity();
        })
        .then(function(res) {
          self.conn.userInfo = merge(self.conn.userInfo, res);
          self._configureJsForce();
          return self.describe();
        })
        .then(function(res) {
          self.initialized = true;
          resolve(self.conn);
        })
        .catch(function(err) {
          logger.error(err);
          reject(err);
        });
    } else {
      reject(new Error('username/password or accesstoken/refreshtoken required'));
    }
  });
};

/**
 * Logs into Salesforce via username/password flow
 * @return {Promise}
 */
SalesforceClient.prototype._login = function() {
  var self = this;
  return new Promise(function(resolve, reject) {

  });
};

/**
 * Returns the org type (developer, production, sandbox, prerelease, custom) for this client
 * @return {String}
 */
SalesforceClient.prototype.getOrgType = function() {
  var validOrgTypes = ['production', 'developer', 'sandbox', 'prerelease', 'custom'];
  if (this.orgType && validOrgTypes.indexOf(this.orgType.toLowerCase()) === -1) {
    return validOrgTypes[1];
  } else if (!this.orgType) {
    return validOrgTypes[1];
  } else {
    return this.orgType.toLowerCase();
  }
};

SalesforceClient.prototype.getUserId = function() {
  if (this.conn && this.conn.userInfo) {
    return this.conn.userInfo.user_id;
  }
};

/**
 * Returns username for this client
 * @return {String}
 */
SalesforceClient.prototype.getUsername = function() {
  if (this.conn && this.conn.userInfo) {
    return this.conn.userInfo.username;
  } else {
    return this.username;
  }
};

/**
 * Returns org namespace for this client
 * @return {String}
 */
SalesforceClient.prototype.getNamespace = function() {
  return this.describeCache.organizationNamespace;
};

/**
 * Returns login url for this client
 * @return {String}
 */
SalesforceClient.prototype.getLoginUrl = function() {
  if (this.loginUrl) {
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
 * Returns access token for this client
 * @return {String}
 */
SalesforceClient.prototype.getAccessToken = function() {
  if (this.conn && this.conn.accessToken) {
    return this.conn.accessToken;
  } else if (this.accessToken) {
    return this.accessToken;
  } else {
    return undefined;
  }
};

/**
 * Returns instance url (e.g., https://na14.salesforce.com) for this client
 * @return {String}
 */
SalesforceClient.prototype.getInstanceUrl = function() {
  return this.instanceUrl || this.conn.instanceUrl || undefined;
};

/**
 * Applies MavensMate-specific settings to jsforce
 * @return {String}
 */
SalesforceClient.prototype._configureJsForce = function() {
  logger.debug('configuring jsforce ...');
  this.conn.metadata.pollTimeout = parseInt(config.get('mm_timeout')) * 1000 || 20000;
  this.conn.bulk.pollTimeout = parseInt(config.get('mm_timeout')) * 1000 || 20000;
};

SalesforceClient.prototype.setPollingTimeout = function(timeout) {
  this.conn.metadata.pollTimeout = timeout || 20000;
  this.conn.bulk.pollTimeout = timeout || 20000;
};

SalesforceClient.prototype.createApexMetadata = function(mavensMateFile) {
  logger.info('createApexMetadata');
  logger.info(mavensMateFile.type);
  var self = this;
  return new Promise(function(resolve, reject) {
    mavensMateFile.mergeTemplate()
      .then(function(body) {
        logger.info(body);
        var payload = {};
        if (mavensMateFile.type.xmlName === 'ApexPage' || mavensMateFile.type.xmlName === 'ApexComponent') {
          payload.markup = body;
        } else {
          payload.body = body;
        }
        if (mavensMateFile.type.xmlName === 'ApexTrigger') {
          payload.TableEnumOrId = mavensMateFile.apexTriggerObjectName;
        } else if (mavensMateFile.type.xmlName !== 'ApexClass') {
          payload.name = mavensMateFile.name;
          payload.MasterLabel = mavensMateFile.name;
        }
        self.conn.tooling.sobject(mavensMateFile.type.xmlName).create(payload, function(err, res) {
          if (err && err.message.indexOf('duplicates value on record with id') === -1) {
            reject(err);
          } else {
            resolve(res);
          }
        });
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

/**
 * Compiles files via Tooling API
 * @param  {Array of Metadata} metadata - metadata to be compiled (must already exist in salesforce)
 * @return {Promise}
 */
SalesforceClient.prototype.compileWithToolingApi = function(files) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // logger.debug('compiling sfdcPaths via tooling api: '+JSON.stringify(sfdcPaths));

    if ( _.filter( files, function(f) { return !f.isToolingType; } ).length > 0 ) {
      return reject('Invalid extension for tooling API compilation');
    }

    // new container
    // add member for each type
    var containerId;

    self._createContainer()
      .then(function(result) {
        containerId = result.id;
        logger.debug('new container id is: '+containerId);
        var memberPromises = [];
        _.each(files, function(f) {
          memberPromises.push(self._createMember(f, containerId));
        });
        return Promise.all(memberPromises);
      })
      .then(function(memberResults) {
        var isMemberSuccess = _.where(memberResults, { 'success': false }).length === 0;

        if (!isMemberSuccess) {
          return reject('Could not create tooling members: '+JSON.stringify(memberResults));
        }

        return self._createContainerAsyncRequest(containerId);
      })
      .then(function(result) {
        self._pollAsyncContainer(containerId, result.id, resolve, reject);
      })
      .catch(function(error) {
        reject(error);
      })
      .done();
  });
};

SalesforceClient.prototype._asyncContainerRequestCompleteHandler = function(containerId, results, resolve, reject) {
  logger.debug('asyncContainerRequestCompleteHandler');
  logger.debug('deleting container id:');
  logger.debug(containerId);
  logger.silly(results);
  try {
    this._deleteContainer(containerId)
      .then(function() {
        resolve(results);
      });
  } catch(e) {
    reject(e);
  }
};

SalesforceClient.prototype._asyncContainerRequestErrorHandler = function(containerId, err, resolve, reject) {
  logger.debug('asyncContainerRequestErrorHandler');
  logger.debug('deleting container id:');
  logger.debug(containerId);
  try {
    this._deleteContainer(containerId)
      .then(function() {
        reject(err);
      });
  } catch(e) {
    reject(e);
  }
};

/**
 * Deletes a metadata container
 *
 * @method SalesforceClient#_deleteContainer
 * @param {String} containerId - Id of metadatacontainer
 */
SalesforceClient.prototype._deleteContainer = function(containerId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.tooling.sobject('MetadataContainer').delete(containerId, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Submits container to create containerasyncrequest
 *
 * @method SalesforceClient#_createContainerAsyncRequest
 * @param {String} containerId - Id of metadatacontainer
 */
SalesforceClient.prototype._createContainerAsyncRequest = function(containerId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.tooling.sobject('ContainerAsyncRequest').create({
      IsCheckOnly: false,
      MetadataContainerId: containerId,
      IsRunTests:false
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Polling until asynccontainer is complete or error
 *
 * @method SalesforceClient#_pollAsyncContainer
 * @param {Number} interval - Polling interval in milliseconds
 * @param {Number} timeout - Polling timeout in milliseconds
 */
SalesforceClient.prototype._pollAsyncContainer = function(containerId, requestId, resolve, reject) {
  logger.debug('_pollAsyncContainer for requestId: '+requestId);
  var self = this;
  var interval = config.get('mm_polling_interval') || 2000;
  var timeout = (config.get('mm_timeout') || 600) * 1000;
  var startTime = new Date().getTime();
  var pollForAsyncContainerResult = function() {
    logger.debug('polling for async container completion...');
    var now = new Date().getTime();
    if (startTime + timeout < now) {
      self.emit('error', new Error('MavensMate timed out while polling Salesforce.com servers. To increase polling timeout, set mm_timeout to number of seconds.'));
      return;
    }
    self._getAsyncRequest(requestId).then(function(results) {
      var done = results[0].State !== 'Queued';
      if (done) {
        self._asyncContainerRequestCompleteHandler(containerId, results, resolve, reject);
      } else {
        setTimeout(pollForAsyncContainerResult, interval);
      }
    }, function(err) {
      self._asyncContainerRequestErrorHandler(containerId, err, resolve, reject);
    });
  };
  pollForAsyncContainerResult();
};

/**
 * Retrieves async request details
 * @return {Promise}
 */
SalesforceClient.prototype._getAsyncRequest = function(requestId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var fields;
    if (parseInt(self.apiVersion) >= 31) {
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
          reject(err);
        } else {
          resolve(records);
        }
      });
  });
};

/**
 * Creates a metadata container for compilation
 * @return {Promise}
 */
SalesforceClient.prototype._createContainer = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.tooling.sobject('MetadataContainer').create({
      name: util.generateRandomString(32)
    }, function(err, res) {
      if (err) {
        reject('Could not create container: '+JSON.stringify(res));
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Creates a Tooling member for each metadata instance passed
 * @param  {Metadata} metadata - Instance of Metadata
 * @param  {String} containerId - Tooling container ID
 * @return {Promise}
 */
SalesforceClient.prototype._createMember = function(file, containerId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var memberName = file.type.xmlName+'Member';
    logger.debug('Creating tooling member:');
    logger.silly(file.body);
    logger.debug(containerId);
    logger.debug(file.id);
    self.conn.tooling.sobject(memberName).create({
      Body: file.body,
      MetadataContainerId: containerId,
      ContentEntityId: file.id
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

SalesforceClient.prototype._checkTest = function(requestId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.tooling.query('Select ApexClassId, ApexClass.Name, Status, ExtendedStatus From ApexTestQueueItem Where ParentJobId = \''+requestId+'\' AND Status IN (\'Aborted\',\'Completed\',\'Failed\')', function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

SalesforceClient.prototype._getTestResults = function(requestId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('getting test results for job id:', requestId);
    self.conn.tooling.query('SELECT Outcome, ApexClassId, ApexClass.Name, MethodName, Message, StackTrace, ApexLogId FROM ApexTestResult WHERE AsyncApexJobId = \''+requestId+'\'', function(err, res) {
      if (err) {
        reject(err);
      } else {
        logger.silly('test results', res);
        resolve(res);
      }
    });
  });
};


/**
 * To run specific test methods
 * [{
      "classId" : "<classId 1>",
      "testMethods" : ["testMethod1","testMethod2","testMethod3"]
      },{
      "classId" : "<classId 2>",
      "testMethods" : ["testMethod1","testMethod2"]
    }];
 */

/**
 * To run classes
 * [ "classid1", "classid2" ]
 */

/**
 * Runs selected apex unit tests
 * @param  {Array} tests - e.g, [{ "ApexClassId" : "1234" }]
 * @return {Promise} Resolves to Object
 */
SalesforceClient.prototype.runTests = function(classIdsOrTestsPayload) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var numberOfTests = classIdsOrTestsPayload.length;
    var pollInterval = numberOfTests >= 5 ? (config.get('mm_polling_interval') || 2000) * 5 : config.get('mm_polling_interval') || 2000;
    logger.debug('runTests polling interval is: ', pollInterval);
    var postBody;
    if (_.isString(classIdsOrTestsPayload[0])) {
      postBody = { classids: classIdsOrTestsPayload.join(',') }
    } else {
      postBody = { tests: classIdsOrTestsPayload };
    }

    logger.debug('submitting tests to be run via runTestsAsynchronous:', postBody);

    self.conn.request({
      method: 'POST',
      url: '/services/data/v'+self.apiVersion+'/tooling/runTestsAsynchronous',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postBody)
    }, function(err, res) {
      if (err) {
        logger.error('Error submitting to runTestsAsynchronous', err);
        reject(err);
      } else {
        logger.info('result from runTestsAsynchronous POST', res);
        var parentJobId = res;

        // poll for the test results
        var startTime = new Date().getTime();
        var pollForTestResult = function() {
          logger.debug('polling for test results...');
          var now = new Date().getTime();
          if (startTime + self.conn.metadata.pollTimeout < now) {
            reject(new Error('Apex test request timed out. Timeout can be configured via mm_timeout setting.'));
            return;
          }
          self._checkTest(parentJobId).then(function(classResults) {
            logger.debug('test status: ');
            logger.debug(classResults);
            if (classResults.size === numberOfTests) {
              self._getTestResults(parentJobId)
                .then(function(result) {
                  resolve({classResults: classResults, methodResults: result});
                })
                .catch(function(err) {
                  reject(new Error('Retrieving test results failed: '+err.message));
                })
                .done();
            } else {
              setTimeout(pollForTestResult, pollInterval);
            }
          })
          .catch(function(err) {
            reject(new Error('Retrieving test results failed: '+err.message));
          })
          .done();
        };
        pollForTestResult();
      }
    });
  });
};

/**
 * Executes anonymous Apex
 * @return {Promise}
 */
SalesforceClient.prototype.executeApex = function(payload) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.tooling.executeAnonymous(payload.body, function(err, res) {
      if (err) {
        reject('Could not execute anonymous apex: '+err.message);
      } else {
        resolve(res);
      }
    });
  });
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
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.metadata.deploy(zipInput, opts)
      .complete(true, function(err, result) {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
  });
};

/**
 * Retrieve packaged medadata --> TODO: finish
 * @param  {Array} packageNames - list of packages
 * @return {Promise}
 */
SalesforceClient.prototype.retrievePackages = function(packageNames) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var r = self.conn.metadata.retrieve({ packageNames: packageNames, apiVersion: self.apiVersion })
      .stream()
      .pipe(fs.createWriteStream('mavensmate.zip'));

    r.on('close', function() {
      logger.debug('ended!');
      resolve();
    });
  });
};

/**
 * Retrieves metadata from salesforce
 * @param  {Array|Object} metadataTypesOrPackage
 * @return {Promise} resolves with readable {Stream}
 */
SalesforceClient.prototype.retrieveUnpackaged = function(metadataTypesOrPackage, writeToDisk, destination) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var unpackagedTypes = [];

    logger.debug('retrieving unpackaged: ');
    logger.debug(metadataTypesOrPackage);

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

    var retrieveRequest = self.conn.metadata.retrieve({
      unpackaged: { types : unpackagedTypes },
      apiVersion: self.apiVersion
    });

    var zipStream = new Stream();
    zipStream.readable = true;

    retrieveRequest.complete(function(err, result) {
      if (err || result.success == 'false') {
        var errorMessage = err != null ? err.message : result.errorMessage;
        logger.error('unpackaged retrieveRequest error: ' + errorMessage);
        if (errorMessage.indexOf('polling time out') >= 0) {
          reject(new Error('Request timed out. Timeout can be configured via mm_timeout setting.'));
        } else {
          reject(new Error(errorMessage));
        }
      } else {
        if (writeToDisk) {
          var writePromise = util.writeStream(zipStream, destination, config.get('mm_legacy_unzip'));
          zipStream.emit('data', new Buffer(result.zipFile, 'base64'));
          zipStream.emit('end');
          writePromise
            .then(function(res) {
              return resolve({zipStream: zipStream, fileProperties: result.fileProperties});
            })
            .catch(function(err) {
              logger.error('error retrieving and writing to disk');
              logger.error(err.message);
              return reject(err);
            });
        } else {
          resolve(result);
        }
      }
    });
  });
};

SalesforceClient.prototype.describeGlobal = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.describeGlobal(function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

SalesforceClient.prototype.describe = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.metadata.describe(self.apiVersion, function(err, res) {
      if (err) {
        reject(err);
      } else {
        self.describeCache = res;
        resolve(res);
      }
    });
  });
};

SalesforceClient.prototype.listFolder = function(metadataType, folder) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var result = {};
    self.conn.metadata.list([{ type: metadataType, folder: folder }], function(err, res) {
      if (err) {
        reject(err);
      } else {
        if (!res) {
          res = [];
        } else if (!_.isArray(res)) {
          res = [res];
        }
        if (config.get('mm_ignore_managed_metadata')) {
          result[folder] = _.filter(res, function(r) {
            return r.manageableState === 'unmanaged' || r.manageableState === undefined;
          });
        } else {
          result[folder] = res;
        }
        resolve(result);
      }
    });
  });
};

SalesforceClient.prototype.list = function(metadataType) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var result = {};
    self.conn.metadata.list([{ type: metadataType }], function(err, res) {
      if (err) {
        reject(err);
      } else {
        if (!res) {
          res = [];
        } else if (!_.isArray(res)) {
          res = [res];
        }
        if (config.get('mm_ignore_managed_metadata')) {
          result[metadataType] = _.filter(res, function(r) {
            return r.manageableState === 'unmanaged' || r.manageableState === undefined;
          });
        } else {
          result[metadataType] = res;
        }
        resolve(result);
      }
    });
  });
};

SalesforceClient.prototype.startSystemStreamingListener = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('starting system streaming listener');
    try {
      self.conn.streaming.channel('/systemTopic/Logging').subscribe(function(message) {
        logger.debug('New Log', message);
        logger.debug('Event Type : ' + message.event.type);
        logger.debug('Event Created : ' + message.event.createdDate);
        logger.debug('Object Id : ' + message.sobject.Id);
        self.emit('sfdcclient-new-log', message);
      });
      logger.debug('streaming listener successfully configured');
      resolve();
    } catch(e) {
      logger.error('Could not start system streaming listener', e);
      if (config.get('mm_http_proxy') || config.get('mm_https_proxy')) {
        logger.error('user has proxy configured but streaming listener not functional.');
        resolve();
      } else {
        reject(new Error('Could not start system streaming listener: '+e.message));
      }
    }
  });
};

/**
 * Creates TraceFlags for all user ids listed in config/.debug
 * @param  {Array} userIds
 * @param  {Date} expiration
 * @return {Promise} resolves to nothing
 */
SalesforceClient.prototype.startLogging = function(debugSettings, expiration) {
  var self = this;
  var userIds = debugSettings.users;
  var debugLevels = debugSettings.levels || {};
  var debugLevelName = debugSettings.debugLevelName || 'MAVENSMATE';
  logger.debug('attempting to start logging for: ');
  logger.debug(userIds);
  logger.debug('expiring: '+expiration);
  // "levels": {
  //     "Workflow": "INFO",
  //     "Callout": "INFO",
  //     "System": "DEBUG",
  //     "Database": "INFO",
  //     "ApexCode": "FINE",
  //     "Validation": "INFO",
  //     "Visualforce": "DEBUG"
  // },
  return new Promise(function(resolve, reject) {
    /*jshint camelcase: false */
    self.conn.tooling.query('SELECT Id FROM DebugLevel WHERE DeveloperName = \''+debugLevelName+'\' AND CreatedById = \''+self.conn.userInfo.user_id+'\'', function(err, res) {
      if (err) {
        reject(new Error('Could not retrieve DebugLevel: '+err.message));
      } else {
        var debugLevelIdsToDelete = [];
        _.each(res.records, function(debugLevel) {
          debugLevelIdsToDelete.push(debugLevel.Id);
        });
        logger.debug('attempting to delete debuglevels: ');
        logger.debug(debugLevelIdsToDelete);
        self.conn.tooling.sobject('DebugLevel').destroy(debugLevelIdsToDelete)
          .then(function(deleteResult) {
            logger.debug('deleted debug level');
            logger.debug(deleteResult);

            logger.debug('creating debug level');
            var debugLevelsToCreate = [];
            var dl = {
              DeveloperName: debugLevelName,
              MasterLabel: debugLevelName,
              Workflow: debugLevels.Workflow || 'DEBUG',
              Callout: debugLevels.Callout || 'DEBUG',
              System: debugLevels.System || 'DEBUG',
              Database: debugLevels.Database || 'DEBUG',
              ApexCode: debugLevels.ApexCode || 'DEBUG',
              ApexProfiling: debugLevels.ApexProfiling || 'DEBUG',
              Validation: debugLevels.Validation || 'DEBUG',
              Visualforce: debugLevels.Visualforce || 'DEBUG'
            };
            debugLevelsToCreate.push(dl);
            logger.debug('attempting to create debug level');

            return self.conn.tooling.sobject('DebugLevel').create(debugLevelsToCreate);
          })
          .then(function(debugLevelCreateResult) {
            logger.debug('debugLevelCreateResult', debugLevelCreateResult);
            var traceFlagsToCreate = [];
            _.each(userIds, function(userId) {
              var tf = {
                ExpirationDate: expiration,
                TracedEntityId: userId,
                LogType: debugSettings.logType || 'USER_DEBUG',
                DebugLevelId: debugLevelCreateResult[0].id
              };
              traceFlagsToCreate.push(tf);
            });
            logger.debug('attempting to create trace flags');
            return self.conn.tooling.sobject('TraceFlag').create(traceFlagsToCreate);
          })
          .then(function(traceFlagCreateResults) {
            logger.debug('Created trace flag(s) for users: ');
            logger.debug(traceFlagCreateResults);
            resolve();
          })
          .catch(function(err) {
            reject(new Error('Could not create Trace Flags: '+err.message));
          })
          .done();
      }
    });
    /*jshint camelcase: true */
  });
};

SalesforceClient.prototype.executeSoql = function(soql) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.conn.query(soql, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

/**
 * Deletes TraceFlags created by the running user for the supplied userIds
 * @param  {Array of Strings} userIds
 * @return {Promise} resolves to nothing
 */
SalesforceClient.prototype.stopLogging = function(userIds) {
  var self = this;
  return new Promise(function(resolve, reject) {
    /*jshint camelcase: false */
    self.conn.tooling.query('SELECT Id FROM TraceFlag WHERE TracedEntityId IN ('+util.joinForQuery(userIds)+') AND CreatedById = \''+self.conn.userInfo.user_id+'\'', function(err, res) {
      if (err) {
        reject(new Error('Could not retrieve TraceFlags for debug users: '+err.message));
      } else {
        var traceFlagIdsToDelete = [];

        _.each(res.records, function(traceFlag) {
          traceFlagIdsToDelete.push(traceFlag.Id);
        });

        self.conn.tooling.sobject('TraceFlag').destroy(traceFlagIdsToDelete)
          .then(function(deleteResult) {
            logger.debug('deleted trace flags');
            logger.debug(deleteResult);
            resolve();
          })
          .catch(function(err) {
            reject(new Error('Could not delete Trace Flags: '+err.message));
          })
          .done();
      }
    });
    /*jshint camelcase: true */
  });
};

SalesforceClient.prototype.getServerProperties = function(mavensMateFiles) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.debug('getting server properties ...');
    logger.silly(mavensMateFiles);

    var baseSoql = 'Select Id, Name, CreatedDate, CreatedById, NamespacePrefix, CreatedBy.Name, LastModifiedById, LastModifiedDate, LastModifiedBy.Name From ';
    var baseSoqlFilter = ' WHERE ID IN (';

    var classes = [];
    var classIds = [];
    var triggers = [];
    var triggerIds = [];
    var pages = [];
    var pageIds = [];
    var components = [];
    var componentIds = [];

    _.each(mavensMateFiles, function(mmf) {
      if (mmf.type.xmlName === 'ApexPage') {
        pageIds.push(mmf.id);
        pages.push(mmf);
      } else if (mmf.type.xmlName === 'ApexTrigger') {
        triggerIds.push(mmf.id);
        triggers.push(mmf);
      } else if (mmf.type.xmlName === 'ApexClass') {
        classIds.push(mmf.id);
        classes.push(mmf);
      } else if (mmf.type.xmlName === 'ApexComponent') {
        componentIds.push(mmf.id);
        components.push(mmf);
      }
    });

    var queries = [];
    if (classes.length > 0) {
      queries.push(
        self.conn.query(baseSoql + 'ApexClass' + baseSoqlFilter + util.joinForQuery(classIds)+')')
      );
    }
    if (components.length > 0) {
      queries.push(
        self.conn.query(baseSoql + 'ApexComponent' + baseSoqlFilter + util.joinForQuery(componentIds)+')')
      );
    }
    if (triggers.length > 0) {
      queries.push(
        self.conn.query(baseSoql + 'ApexTrigger' + baseSoqlFilter + util.joinForQuery(triggerIds)+')')
      );
    }
    if (pages.length > 0) {
      queries.push(
        self.conn.query(baseSoql + 'ApexPage' + baseSoqlFilter + util.joinForQuery(pageIds)+')')
      );
    }

    Promise.all(queries)
      .then(function(res) {
        var results = [];
        _.each(res, function(r) {
          if (r.records && r.records.length > 0) {
            Array.prototype.push.apply(results, r.records);
          }
        });
        resolve(results);
      })
      .catch(function(err) {
        logger.error('could not get server properties for Apex/VF metadata', err);
        reject(err);
      });
  });
};

module.exports = SalesforceClient;
