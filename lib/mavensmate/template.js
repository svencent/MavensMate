'use strict';
var Q         = require('q');
var _         = require('lodash');
var swig      = require('swig');
var fs        = require('fs-extra');
var path      = require('path');
var util      = require('./util').instance;
var request   = require('request');
var config    = require('./config');
var logger    = require('winston');


function TemplateService() {

}

TemplateService.prototype.getTemplatesForType = function(metadataTypeXmlName) {
	var deferred = Q.defer();

	this._getPackage()
		.then(function(pkg) {
			deferred.resolve(pkg[metadataTypeXmlName]);
		})
		['catch'](function(e) {
			deferred.reject(new Error('Could not retrieve templates for type: '+metadataTypeXmlName+', '+e.message));
		})
		.done();

	return deferred.promise;
};

TemplateService.prototype.getTemplateBody = function(metadataTypeXmlName, template) {
	var deferred = Q.defer();
	/*jshint camelcase: false */
	var templateFileName = template.file_name; // TODO: standardize format
	var templateSource = config.get('mm_template_source');
	if (templateSource === undefined || templateSource === '') {
	  templateSource = 'joeferraro/MavensMate-Templates/master';
	}
	var templateLocation = config.get('mm_template_location');
	if (templateLocation === undefined || templateLocation === '') {
	  templateLocation = 'remote';
	}

	var templateBody;
	if (templateLocation === 'remote') {
	  request('https://raw.githubusercontent.com/'+templateSource+'/'+metadataTypeXmlName+'/'+templateFileName, function(error, response, body) {
	    if (!error && response.statusCode === 200) {
	      templateBody = body;
	    } else {
	      templateBody = util.getFileBody(path.join(templateSource,metadataTypeXmlName,templateFileName));
	    }
	    deferred.resolve(templateBody);
	  });
	} else {
	  templateBody = util.getFileBody(path.join(__dirname,'templates','github',metadataTypeXmlName,templateFileName));
	  deferred.resolve(templateBody);
	}
	return deferred.promise;
};

TemplateService.prototype._getPackage = function() {

	var deferred = Q.defer();
	/*jshint camelcase: false */

	try {
		var templateSource = config.get('mm_template_source');
		if (!templateSource) {
		  templateSource = 'joeferraro/MavensMate-Templates/master';
		}
		var templateLocation = config.get('mm_template_location');
		if (!templateLocation) {
		  templateLocation = 'remote';
		}

		var templatePackage;
		if (templateLocation === 'remote') {
		  request('https://raw.githubusercontent.com/'+templateSource+'/package.json', function(error, response, body) {
		    if (!error && response.statusCode === 200) {
		      templatePackage = JSON.parse(body);
		    } else {
		      templatePackage = util.getFileBody(path.join(__dirname,'templates','github','package.json'), true);
		    }
		    deferred.resolve(templatePackage);
		  });
		} else {
		  templatePackage = util.getFileBody(path.join(__dirname,'templates','github','package.json'), true);
		  deferred.resolve(templatePackage);
		}
	} catch(e) {
		deferred.reject(new Error('Could not obtain template package: '+e.message));
	}


	/*jshint camelcase: true */
	return deferred.promise;
};

module.exports = TemplateService;