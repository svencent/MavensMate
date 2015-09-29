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
var config = require('./config');
var os = require('os');

var KeychainService = function() { };

/**
 * If user has opted in (mm_use_keyring=true) AND node-keychain is installed, use the system keychain
 * @return {Boolean}
 */
KeychainService.prototype.useSystemKeychain = function() {
  return config.get('mm_use_keyring') && systemKeychainSupported && os.platform() !== 'linux';
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
 * @param  {String} id       
 * @param  {String} password 
 * @return {Nothing}          
 */
KeychainService.prototype.storePassword = function(id, password) {
  if (this.useSystemKeychain()) {
    return keychain.addPassword('MavensMate: '+id, id, password);
  } else {
    throw new Error('System keychain service not supported');
  }
};

/**
 * Update password in the system keychain
 * @param  {String} id       
 * @param  {String} password 
 * @return {Nothing}          
 */
KeychainService.prototype.replacePassword = function(id, password) {
  if (this.useSystemKeychain()) {
    return keychain.replacePassword('MavensMate: '+id, id, password);
  } else {
    throw new Error('System keychain service not supported');
  }
};

/**
 * Retrieve password from the system keychain
 * @param  {String} id       
 * @return {String}          
 */
KeychainService.prototype.getPassword = function(id) {
  if (this.useSystemKeychain()) {
    return keychain.getPassword('MavensMate: '+id, id);
  } else {
    throw new Error('System keychain service not supported');
  }
};

module.exports = KeychainService;