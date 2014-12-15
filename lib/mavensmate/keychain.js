'use strict';

var systemKeychainSupported = true;
try {
  var keytar = require('keytar');
} catch (er) {
  systemKeychainSupported = false; 
}
var config = require('./config');

var KeychainService = function() { };

KeychainService.prototype.useSystemKeychain = function() {
  return config.get('mm_use_keyring') && systemKeychainSupported;
};

KeychainService.prototype.storePassword = function(id, password) {
  if (this.useSystemKeychain()) {
    return keytar.addPassword('MavensMate: '+id, id, password);
  } else {
    throw new Error('System keychain service not supported');
  }
};

KeychainService.prototype.replacePassword = function(id, password) {
  if (this.useSystemKeychain()) {
    return keytar.replacePassword('MavensMate: '+id, id, password);
  } else {
    throw new Error('System keychain service not supported');
  }
};

KeychainService.prototype.getPassword = function(id) {
  if (this.useSystemKeychain()) {
    return keytar.getPassword('MavensMate: '+id, id);
  } else {
    throw new Error('System keychain service not supported');
  }
};

module.exports = KeychainService;