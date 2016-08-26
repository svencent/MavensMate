var path = require('path');
var logger = require('winston');
var util = require('../lib/util');

var resourceMap = {
  project : {
    iconClassName: 'slds-icon-standard-folder',
    iconName: 'folder'
  },
  metadata : {
    iconClassName: 'slds-icon-standard-document',
    iconName: 'document'
  },
  lightning : {
    iconClassName: 'slds-icon-standard-connected-apps',
    iconName: 'connected_apps'
  },
  connections : {
    iconClassName: 'slds-icon-standard-environment-hub',
    iconName: 'environment_hub'
  },
  deploy : {
    iconClassName: 'slds-icon-standard-environment-hub',
    iconName: 'environment_hub'
  },
  auth : {
    iconClassName: 'slds-icon-standard-avatar',
    iconName: 'avatar'
  },
  settings : {
    iconClassName: 'slds-icon-standard-quotes',
    iconName: 'settings',
    sldsSprite: 'utility-sprite'
  }
};

module.exports = function(req, res, next) {
  var swig = req.app.get('swig');
  swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.join(path.dirname(__dirname))) });
  // set locals for templates
  if (util.startsWith(req.url, '/app/')) {
    res.locals.url = req.url;
    var appRoutePattern = /\/app\/([^\/]*)/
    var match = req.url.match(appRoutePattern);
    if (match) {
      var resource = match[1];
      if (resourceMap[resource]) {
        res.locals.sldsIconClassName = resourceMap[resource].iconClassName;
        res.locals.sldsIconName = resourceMap[resource].iconName;
        res.locals.sldsSprite = resourceMap[resource].sldsSprite || 'standard-sprite';
      }
    }
  }
  next();
};