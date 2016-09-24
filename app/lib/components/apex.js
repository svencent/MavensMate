'use strict';

var inherits  = require('inherits');
var Component = require('./component');
var logger    = require('winston');

var apexTypes = [ 'ApexClass', 'ApexPage', 'ApexComponent', 'ApexTrigger' ];

var ApexComponent = function(project, filePath) {
  Component.call(this, project, filePath);
}

inherits(ApexComponent, Component);

ApexComponent.isApexType = function(xmlName) {
  return apexTypes.indexOf(xmlName) >= 0;
};

module.exports = ApexComponent;