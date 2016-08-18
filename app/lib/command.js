/**
 * @file Base command class. Each command implements an execute function that performs the work.
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var _               = require('lodash');
var logger          = require('winston');
var MetadataHelper  = require('./metadata').MetadataHelper;

/**
 * Base command class
 * @param {Array} args
 * @param {Array[0]} - client instance (object)
 * @param {Array[1]} - payload for the command (object)
 * @param {Array[2]} - editorService for facilitating interaction with the editors (sublime, atom, vim, vscode, etc.)
 */
var BaseCommand = function(args) {
  this.setProject(args[0]);
  this.payload = args[1];
  this.editorService = args[2];
  this.metadataHelper = new MetadataHelper();
};

/**
 * Sets unique identifier for the command for tracking purposes
 * @param {String} id - unique id (via uuid)
 */
BaseCommand.prototype.setId = function(id) {
  this._id = id;
};

/**
 * Returns the command id
 * @return {String} - unique id of the command
 */
BaseCommand.prototype.getId = function() {
  return this._id;
};

/**
 * Sets the project running this command (optional)
 * @param {Object} project - project instance
 */
BaseCommand.prototype.setProject = function(project) {
  this._project = project;
};

/**
 * Returns the project running this command (optional)
 * @return {Object} - project instance
 */
BaseCommand.prototype.getProject = function() {
  return this._project;
};

/**
 * Whether the command is requesting a UI
 * @return {Boolean}
 */
BaseCommand.prototype.isUICommand = function() {
  return (this.payload && this.payload.args) ? this.payload.args.ui : false;
};

module.exports = BaseCommand;
