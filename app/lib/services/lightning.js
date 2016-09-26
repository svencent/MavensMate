/**
 * @file Responsible for CRUD of Lightning metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise = require('bluebird');
var _       = require('lodash');
var path    = require('path');
var logger  = require('winston');
var util    = require('../util');

// TODO: move source strings to swig templates

var LightningService = function(project){
  this.project = project;
};

LightningService.prototype.getAll = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.query('Select Id, AuraDefinitionBundleId,AuraDefinitionBundle.DeveloperName,DefType,Format FROM AuraDefinition', function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res.records);
      }
    });
  });
};

LightningService.prototype.createBundle = function(apiName, description) {
  var self = this;
  logger.debug('Creating lightning bundle: '+apiName);
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinitionBundle').create({
      Description: description, // my description
      DeveloperName: apiName, // cool_bro
      MasterLabel: apiName, // cool bro
      ApiVersion: self.project.config.get('mm_api_version')
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        logger.debug('Lightning bundle creation result: ');
        logger.debug(res);
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createBundleItem = function(bundleId, lightningType, sourceFormat, source) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: _.toUpper(lightningType),
      Format: sourceFormat,
      Source: source
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.deleteBundle = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinitionBundle').delete(bundleId, function(err, res) {
      if (err) {
        reject(new Error('Could not delete AuraBundle: '+err.message));
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.deleteBundleItems = function(documents) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var deleteIds = [];
    _.each(documents, function(d) {
      deleteIds.push(d.getLocalStoreProperties().id);
    });
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').delete(deleteIds)
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

LightningService.prototype.getBundle = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.query('Select Id, ApiVersion, Description, DeveloperName, Language, MasterLabel, NamespacePrefix FROM AuraDefinitionBundle WHERE Id = \''+bundleId+'\'')
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(new Error('Could not get bundles: '+err.message));
      });
  });
};

LightningService.prototype.getBundles = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.query('Select Id, ApiVersion, Description, DeveloperName, Language, MasterLabel, NamespacePrefix FROM AuraDefinitionBundle')
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(new Error('Could not get bundles: '+err.message));
      });
  });
};

LightningService.prototype.getBundleItems = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.query('Select Id, AuraDefinitionBundleId, AuraDefinitionBundle.DeveloperName, DefType, Format FROM AuraDefinition WHERE AuraDefinitionBundleId =\''+bundleId+'\'')
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(new Error('Could not get bundle items: '+err.message));
      });
  });
};

/**
 * Updates one or more lightning components
 * @param  {Array} - array of Document instances
 * @return {Promise}
 */
LightningService.prototype.update = function(documents) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var updatePayload = [];
    _.each(documents, function(d) {
      updatePayload.push({
        Source: d.getBodySync(),
        Id: d.getLocalStoreProperties().id
      });
    });
    logger.debug('updating lightning components', updatePayload);
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').update(updatePayload)
      .then(function(res) {
        resolve(res);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

LightningService.prototype.createComponent = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'COMPONENT',
      Format: 'XML',
      Source: '<aura:component></aura:component>'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createApplication = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'APPLICATION',
      Format: 'XML',
      Source: '<aura:application></aura:application>'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createInterface = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'INTERFACE',
      Format: 'XML',
      Source: '<aura:interface description="Interface template">\n\t<aura:attribute name="example" type="String" default="" description="An example attribute."/>\n</aura:interface>'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createDocumentation = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'DOCUMENTATION',
      Format: 'XML',
      Source: '<aura:documentation>\n\t<aura:description>Documentation</aura:description>\n\t<aura:example name="ExampleName" ref="exampleComponentName" label="Label">\n\t\tExample Description\n\t</aura:example>\n</aura:documentation>'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createController = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'CONTROLLER',
      Format: 'JS',
      Source: '({\n\tmyAction : function(component, event, helper) {\n\t}\n})'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createRenderer = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'RENDERER',
      Format: 'JS',
      Source: '({\n\t// Your renderer method overrides go here\n})'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createHelper = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'HELPER',
      Format: 'JS',
      Source: '({\n\thelperMethod : function() {\n\t}\n})'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createStyle = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'STYLE',
      Format: 'CSS',
      Source: '.THIS {\n}'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createDesign = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    logger.warn('creating design', bundleId);
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'DESIGN',
      Format: 'XML',
      Source: '<design:component>\n\n</design:component>'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createSvg = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'SVG',
      Format: 'SVG',
      Source: '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg width="120px" height="120px" viewBox="0 0 120 120" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">\n</svg>'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

LightningService.prototype.createEvent = function(bundleId) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.project.sfdcClient.conn.tooling.sobject('AuraDefinition').create({
      AuraDefinitionBundleId: bundleId,
      DefType: 'EVENT',
      Format: 'XML',
      Source: '<aura:event type="APPLICATION" description="Event template" />'
    }, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
};

module.exports = LightningService;