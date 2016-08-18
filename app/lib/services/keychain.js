/**
 * @file Responsible for interacting with the local secure store if one exists
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var systemKeychainSupported = true;
try {
  var keychain = require('keytar');
} catch (e) {
  systemKeychainSupported = false;
}
var config = require('../../config');
var os = require('os');
var logger = require('winston');

var KeychainService = function() { };

/**
 * If user has opted in (mm_use_keyring=true) AND node-keychain is installed, use the system keychain
 * @return {Boolean}
 */
KeychainService.prototype.useSystemKeychain = function() {
  return config.get('mm_use_keyring') && systemKeychainSupported;
};

/**
 * Whether node-keychain is installed properly
 * @return {Boolean}
 */
KeychainService.prototype.isSystemKeychainSupported = function() {
  return systemKeychainSupported;
};

/**
 * Put password in the system keychain
 * @param  {String} id - the project id or id of the org connection
 * @param  {String} password - the accessToken or refreshToken to store as a "password"
 * @param  {String} type - either "accessToken" or "refreshToken" or "password"
 * @return {Nothing}
 */
KeychainService.prototype.storePassword = function(id, password, type) {
  logger.debug('Storing password of type', type, 'for', id);
  if (this.useSystemKeychain()) {
    var storePasswordResult = keychain.addPassword('MavensMate-'+type, id, password);
    if (!storePasswordResult) {
      throw new Error('Could not store '+type+' for '+id);
    }
    return storePasswordResult;
  } else {
    throw new Error('Attempt to store password failed: system keychain service not supported');
  }
};

/**
 * Update password in the system keychain
 * @param  {String} id - the project id or id of the org connection
 * @param  {String} password - the accessToken or refreshToken or password to store as a "password"
 * @param  {String} type - either "accessToken" or "refreshToken" or "password"
 * @return {Nothing}
 */
KeychainService.prototype.replacePassword = function(id, password, type) {
  logger.debug('Replacing password of type', type, 'for', id);
  if (this.useSystemKeychain()) {
    var replacePasswordResult = keychain.replacePassword('MavensMate-'+type, id, password);
    if (!replacePasswordResult) {
      throw new Error('Could not replace '+type+' for '+id);
    }
    return replacePasswordResult;
  } else {
    throw new Error('Attempt to replace password in keychain failed: system keychain service not supported');
  }
};

/**
 * Retrieve password from the system keychain
 * @param  {String} id - the project id or id of the org connection
 * @param  {String} type - either "accessToken" or "refreshToken" or "password"
*/
KeychainService.prototype.getPassword = function(id, type) {
  logger.debug('Retrieving password of type', type, 'for', id);
  if (this.useSystemKeychain()) {
    var getPasswordResult = keychain.getPassword('MavensMate-'+type, id);
    if (!getPasswordResult) {
      throw new Error('Could not get '+type+' for '+id);
    }
    return getPasswordResult;
  } else {
    throw new Error('Attempt to get password from keychain failed: system keychain service not supported');
  }
};

module.exports = KeychainService;