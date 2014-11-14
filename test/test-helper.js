'use strict';

var _ 							= require('lodash');
var mavensmate 			= require('../lib/mavensmate');
var MetadataService = require('../lib/mavensmate/metadata').MetadataService;
var fs 							= require('fs-extra');
var path 						= require('path');

exports.createClient = function(editor) {
	return mavensmate.createClient({
		editor: editor,
		headless: true,
		debugging: true
	});
};

exports.baseTestDirectory = function() {
	return __dirname;
};

exports.cleanUpWorkspace = function() {
	var unitTestProjectPath = path.join(this.baseTestDirectory(),'workspace','unittest');
	if (fs.existsSync(unitTestProjectPath)) {
		fs.removeSync(unitTestProjectPath);
	}
};

exports.setProject = function(client, projectName, callback) {
	client.setProject(path.join(this.baseTestDirectory(),'workspace', projectName), function(err, response) {
		callback(err, response);
	});
};

exports.getProjectFiles = function(project, typeXmlName, numberOfFiles) {
	var metadataService = new MetadataService({ sfdcClient: project.sfdcClient });
	var metadataType = metadataService.getTypeByName(typeXmlName);
	var projectPath = path.join(this.baseTestDirectory(),'workspace', project.getName());
	var metadataDirectory = path.join(projectPath, 'src', metadataType.directoryName);
	if (!numberOfFiles) {
		numberOfFiles = 1;
	}
	var files = [];
	if (fs.existsSync(metadataDirectory)) {
		fs.readdirSync(metadataDirectory).forEach(function(filename) {
			if (files.length < numberOfFiles) {
				if (filename.indexOf('-meta.xml') === -1) {
					files.push(path.join(metadataDirectory, filename));
				}
			}
		});
	}
	return files;
};