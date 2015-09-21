/**
 * @file Creates new metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util').instance;
var mavensMateFile  = require('../../file');
var Deploy          = require('../../deploy');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var EditorService   = require('../../editor');
var path            = require('path');
var Package         = require('../../package').Package;
var temp            = require('temp');
var fs              = require('fs-extra');
var logger          = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      var editorService = new EditorService(self.client, self.editor);
      editorService.launchUI('new-metadata', { pid: self.getProject().settings.id, type: self.payload.args.type })
        .then(function() {
          resolve('Success');
        })
        .catch(function(err) {
          reject({
            message: 'Could not open new metadata UI',
            error: err
          });
        });
    } else {
      var retrievePackage;
      var project = self.getProject();
      var newFile = new mavensMateFile.MavensMateFile({ project: project });
      newFile.setTypeByXmlName(self.payload.metadataTypeXmlName);
      newFile.template = self.payload.template;
      newFile.templateValues = self.payload.templateValues;
      newFile.apexTriggerObjectName = self.payload.templateValues.object_name || self.payload.templateValues.objectName;
      newFile.name = self.payload.templateValues.api_name || self.payload.templateValues.apiName;
      if (!newFile.name) {
        return reject(new Error('You must provide an API name'));
      }
      newFile.setAbstractPath();
      var tempRetrievePath = temp.mkdirSync({ prefix: 'mm_' });
      var unpackagedRetrievePath = path.join(tempRetrievePath, 'unpackaged');
      fs.mkdirsSync(unpackagedRetrievePath);
      project.sfdcClient.createApexMetadata(newFile)
        .then(function(createResult) {
          retrievePackage = new Package({ subscription: mavensMateFile.createPackageSubscription([newFile]) });
          return retrievePackage.init();
        })
        .then(function() {
          return project.sfdcClient.retrieveUnpackaged(retrievePackage.subscription, true, tempRetrievePath);
        })
        .then(function(retrieveResult) {
          return project.updateLocalStore(retrieveResult.fileProperties);
        })
        .then(function() {
          return project.replaceLocalFiles(unpackagedRetrievePath);
        })
        .then(function() {
          project.packageXml.subscribe(newFile);
          return project.packageXml.writeFile();
        })
        .then(function() {
          logger.debug('attempting to open metadata ...');
          var newMetadataPath = path.join(project.path, 'src', newFile.type.directoryName, [newFile.name, newFile.type.suffix].join('.'));
          logger.debug(newMetadataPath);
          logger.debug(self.editor);
          if (self.editor) {
            var editorService = new EditorService(self.client, self.editor);
            return editorService.open(newMetadataPath);
          } else {
            return resolve('Success');
          }
        })
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        })
        .done(); 
    } 
  });
};

exports.command = Command;
exports.addSubCommand = function(client) {
  client.program
    .command('new-metadata')
    .option('--ui', 'Launches the default UI for the selected command.')
    .option('-t, --type [type]', 'Type of metadata to create (ApexClass, ApexPage, ApexTrigger, ApexComponent, etc.')
    .description('Creates new metadata based on supplied template and params')
    .action(function() {
      if (this.ui) {
        client.executeCommand(this._name, { args: { ui: true, type: this.type } });    
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            client.executeCommand(self._name, payload, self.parent.editor); 
          });
      }  
    });
};