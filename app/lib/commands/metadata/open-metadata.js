/**
 * @file Opens existing metadata in the Salesforce UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var Promise             = require('bluebird');
var util                = require('../../util');
var inherits            = require('inherits');
var BaseCommand         = require('../../command');
var _                   = require('lodash');
var EditorService       = require('../../services/editor');
var MavensMateFile      = require('../../file').MavensMateFile;
var mavensMateFileTypes = require('../../file').types;
var logger              = require('winston');

function Command() {
  BaseCommand.call(this, arguments);
}

inherits(Command, BaseCommand);

Command.prototype.execute = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var paths = self.payload.paths;
    var project = self.getProject();

    var frontdoorUrl = project.sfdcClient.getInstanceUrl() + '/secur/frontdoor.jsp?sid=' + project.sfdcClient.getAccessToken() + '&retURL=';
    var openUrlPromises = [];
    var urls = {};
    _.each(paths, function(p) {
      var mmFile = new MavensMateFile({ project: project, path: p });
      var retUrl = '';
      if (mmFile.type.xmlName === 'ApexPage' && self.payload.preview) {
        retUrl = '/apex/' + mmFile.name;
      } else if (mmFile.isLightningType && self.payload.preview) {
        var bundleName;
        if (mmFile.classification === mavensMateFileTypes.LIGHTNING_BUNDLE_ITEM) {
          bundleName = mmFile.folderBaseName;
        } else {
          bundleName = mmFile.name;
        }
        // retUrl = project.sfdcClient.getInstanceUrl() + '/' + project.sfdcClient.getNamespace() + '/' + bundleName + '.app'; // TODO: non app lightning will not work
        retUrl = '/' + project.sfdcClient.getNamespace() + '/' + bundleName + '.app'; // TODO: non app lightning will not work
      } else {
        if (mmFile.type.xmlName === 'CustomObject') {
          retUrl = '/p/setup/layout/LayoutFieldList?type=' + mmFile.name + '%23CustomFieldRelatedList_target';
        } else {
          retUrl = '/' + mmFile.id;
        }
      }
      logger.debug('url generated : '+frontdoorUrl+retUrl);
      if (self.payload.callThrough) {
        openUrlPromises.push( self.editorService.openUrl(frontdoorUrl+retUrl) );
      } else {
        urls[mmFile.basename] = frontdoorUrl+retUrl;
      }
    });

    if (self.payload.callThrough) {
      Promise.all(openUrlPromises)
        .then(function() {
          resolve('Success');
        })
        .catch(function(error) {
          reject(error);
        });
    } else {
      resolve(urls);
    }
  });
};

exports.command = Command;
exports.addSubCommand = function(program) {
  program
    .command('open-metadata [path]')
    .description('Opens metadata in the browser')
    .action(function(path){
      if (path) {
        program.commandExecutor.execute({
          name: this._name,
          body: {
            paths : util.getAbsolutePaths( [ path ] )
          }
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