'use strict';

var _ 				= require('lodash');
var which 		= require('which');
var exec 			= require('child_process').exec;
var command 	= require('shelly');
var logger 		= require('winston');
var util 			= require('./util').instance;
var config 		= require('./config');

var EditorService = function(client) {
	if (!client.editor || !_.isString(client.editor)) {
		throw new Error('Could not initiate editor service. Client must contain valid editor name');
	}
	this.client = client;
};

EditorService.prototype.open = function(path) {
	if (this.client.editor.toLowerCase() === 'atom') {
		try {
			if (which.sync('atom')) {
				exec(command(which.sync('atom'), path), function (error, stdout, stderr) {
					logger.debug('Result of path open in atom: ');
					logger.debug(error);
					logger.debug(stdout);
					logger.debug(stderr);
				});
			}
		} catch(e) {
			logger.debug('Could not open path in Atom: '+e.message+'. Attempting to use config variable to open.');

			var atomExecConfig;
			if (util.isWindows()) {
				atomExecConfig = config.get('mm_atom_exec_win');
			} else if (util.isLinux()) {
				atomExecConfig = config.get('mm_atom_exec_linux');
			} else if (util.isMac()) {
				atomExecConfig = config.get('mm_atom_exec_osx');
			}
			if (atomExecConfig) {
				try {
					exec(command(atomExecConfig, path), function (error, stdout, stderr) {
						logger.debug('Result of path open in atom: ');
						logger.debug(error);
						logger.debug(stdout);
						logger.debug(stderr);
					});
				}	catch(e) {
					logger.debug('Tried to use '+atomExecConfig+ ', however could not open path');
				}
			}
		}
 	} else if (this.client.editor.toLowerCase() === 'sublime') {
		// TODO
	}
};

module.exports = EditorService;