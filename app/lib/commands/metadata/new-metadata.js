/**
 * @file Creates new metadata
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise         = require('bluebird');
var util            = require('../../util');
var mavensMateFile  = require('../../file');
var Deploy          = require('../../services/deploy');
var inherits        = require('inherits');
var BaseCommand     = require('../../command');
var EditorService   = require('../../services/editor');
var path            = require('path');
var Package         = require('../../package').Package;
var temp            = require('temp');
var fs              = require('fs-extra');
var logger          = require('winston');
var createUtil      = require('../../create/util');
var CreateDelegate  = require('../../create/delegate');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.isUICommand()) {
      self.editorService.launchUI('metadata/'+self.payload.args.type+'/new', { pid: self.getProject().id, type: self.payload.args.type })
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
      var paths = self.payload.paths;
      var promise;
      if (!paths) {
        // need to merge templates, get the paths first
        promise = createUtil.mergeTemplatesAndWriteToDisk(self.getProject(), self.payload);
      } else {
        promise = Promise.resolve();
      }

      promise
        .then(function(paths) {
          var createDelegate = new CreateDelegate(self.getProject(), paths);
          return createDelegate.execute();
        })
        .then(function(res) {
          resolve(res);
        })
        .catch(function(err) {
          reject(err);
        });
      // var retrievePackage;
      // var project = self.getProject();
      // var newFile = new mavensMateFile.MavensMateFile({ project: project });
      // newFile.setTypeByXmlName(self.payload.metadataTypeXmlName);
      // newFile.template = self.payload.template;
      // newFile.templateValues = self.payload.templateValues;
      // newFile.apexTriggerObjectName = self.payload.templateValues.object_name || self.payload.templateValues.objectName;
      // newFile.name = self.payload.templateValues.api_name || self.payload.templateValues.apiName;
      // if (!newFile.name) {
      //   return reject(new Error('You must provide an API name'));
      // }
      // newFile.setAbstractPath();
      // var tempRetrievePath = temp.mkdirSync({ prefix: 'mm_' });
      // var unpackagedRetrievePath = path.join(tempRetrievePath, 'unpackaged');
      // fs.mkdirsSync(unpackagedRetrievePath);
      // project.sfdcClient.createApexMetadata(newFile)
      //   .then(function(createResult) {
      //     retrievePackage = new Package({ subscription: mavensMateFile.createPackageSubscription([newFile]) });
      //     return retrievePackage.init();
      //   })
      //   .then(function() {
      //     return project.sfdcClient.retrieveUnpackaged(retrievePackage.subscription, true, tempRetrievePath);
      //   })
      //   .then(function(retrieveResult) {
      //     return project.updateLocalStore(retrieveResult.fileProperties);
      //   })
      //   .then(function() {
      //     return project.replaceLocalFiles(unpackagedRetrievePath);
      //   })
      //   .then(function() {
      //     project.packageXml.subscribe(newFile);
      //     return project.packageXml.writeFile();
      //   })
      //   .then(function() {
      //     logger.debug('attempting to open metadata ...');
      //     var newMetadataPath = path.join(project.path, 'src', newFile.type.directoryName, [newFile.name, newFile.type.suffix].join('.'));
      //     logger.debug(newMetadataPath);
      //     logger.debug(self.editorService.editor);
      //     if (self.editorService && self.editorService.editor) {
      //       return self.editorService.open(newMetadataPath);
      //     } else {
      //       return resolve('New metadata successfully created');
      //     }
      //   })
      //   .then(function() {
      //     resolve('New metadata successfully created');
      //   })
      //   .catch(function(error) {
      //     reject(error);
      //   })
      //   .done();
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('new-metadata')
    .option('--ui', 'Launches the default UI for the selected command.')
    .option('-t, --type [type]', 'Type of metadata to create (ApexClass, ApexPage, ApexTrigger, ApexComponent, etc.')
    .description('Creates new metadata based on supplied template and params')
    .action(function() {
      if (this.ui) {
        program.commandExecutor.execute({
          name: this._name,
          body: { args: { ui: true, type: this.type } }
        });
      } else {
        var self = this;
        util.getPayload()
          .then(function(payload) {
            program.commandExecutor.execute({
              name: self._name,
              body: payload,
              editor: self.parent.editor
            });
          });
      }
    });
};