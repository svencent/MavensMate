var path = require('path');
var logger = require('winston');
var util = require('../lib/util');

var resourceMap = {
  project: {
    iconClassName: 'slds-icon-standard-folder',
    iconName: 'folder'
  },
  metadata: {
    iconClassName: 'slds-icon-standard-document',
    iconName: 'document'
  },
  lightning: {
    iconClassName: 'slds-icon-standard-connected-apps',
    iconName: 'connected_apps'
  },
  connections: {
    iconClassName: 'slds-icon-standard-environment-hub',
    iconName: 'environment_hub'
  },
  deploy: {
    iconClassName: 'slds-icon-standard-environment-hub',
    iconName: 'environment_hub'
  },
  auth: {
    iconClassName: 'slds-icon-standard-avatar',
    iconName: 'avatar'
  },
  test: {
    iconClassName: 'slds-icon-standard-dashboard',
    iconName: 'dashboard'
  },
  settings: {
    iconClassName: 'slds-icon-standard-quotes',
    iconName: 'settings',
    sprite: 'utility-sprite'
  },
  logs: {
    iconClassName: 'slds-icon-standard-record',
    iconName: 'record'
  },
  apex: {
    iconClassName: 'slds-icon-standard-custom',
    iconName: 'custom'
  },
  home: {
    iconClassName: 'slds-icon-standard-home',
    iconName: 'home'
  }
};

module.exports = function(req, res, next) {
  var swig = req.app.get('swig');

  // do we need this??
  // swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.join(path.dirname(__dirname))) });

  // set locals for templates
  if (util.startsWith(req.url, '/app/') && !util.startsWith(req.url, '/app/static')) {
    if (req.app.get('isDesktop'))
      res.locals.isDesktop = req.app.get('isDesktop');
    res.locals.url = req.url;
    var appRoutePattern = /\/app\/([^\W]*)/
    var match = req.url.match(appRoutePattern);
    if (match) {
      var resource = match[1];
      if (resourceMap[resource]) {
        res.locals.sldsIconClassName = resourceMap[resource].iconClassName;
        res.locals.sldsIconName = resourceMap[resource].iconName;
        res.locals.sldsSprite = resourceMap[resource].sprite || 'standard-sprite';
      }
    }
  }
  next();
};