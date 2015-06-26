/* new_metadata commander component
 * To use add require('../cmds/new-metadata.js')(program) to your commander.js based node executable before program.parse
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
// var logger          = require('winston');

function Command() {
  Command.super_.call(this, Array.prototype.slice.call(arguments, 0));
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand() && self.client.editor === 'sublime') {
      var editorService = new EditorService(self.client);
      editorService.launchUI('new-metadata', { pid: self.getProject().settings.id, type: self.payload.args.type })
        .then(function() {
          resolve('Success');
        })
        .catch(function(err) {
          reject({
            message: 'Could not open new metadata UI',
            error: error
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
      newFile.setAbstractPath();
      var newPath = temp.mkdirSync({ prefix: 'mm_' });
      var retrievePath = path.join(newPath, 'unpackaged');
      fs.mkdirsSync(retrievePath);
      project.sfdcClient.createApexOrVisualforceFile(newFile)
        .then(function(createResult) {
          retrievePackage = new Package({ subscription: mavensMateFile.createPackageSubscription([newFile]) });
          return retrievePackage.init();
        })
        .then(function() {
          return project.sfdcClient.retrieveUnpackaged(retrievePackage.subscription, true, newPath);
        })
        .then(function(retrieveResult) {
          return project.updateLocalStore(retrieveResult.fileProperties);
        })
        .then(function() {
          return project.replaceLocalFiles(retrievePath);
        })
        .then(function() {
          project.packageXml.subscribe(newFile);
          return project.packageXml.writeFile();
        })
        .then(function() {
          if (self.client.editor) {
            var newMetadataPath = path.join(project.path, 'src', newFile.type.directoryName, [newFile.name, newFile.type.suffix].join('.'));
            new EditorService(self.client).open(newMetadataPath);
          } 
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
            client.executeCommand(self._name, payload); 
          });
      }  
    });
};