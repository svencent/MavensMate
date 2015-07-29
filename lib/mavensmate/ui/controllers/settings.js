/**
 * @file Controller for the home UI
 * @author Joseph Ferraro <@joeferraro>
 */

'use strict';

var fs              = require('fs');
var util            = require('../../util').instance;
var path            = require('path');
var logger          = require('winston');
var config          = require('../../config');
var defaultSettings   = require('../../config/default');

var SettingsController = function(req) { };

/**
 * GET
 */
SettingsController.prototype.index = function(req, res) {
  var locals = {
    userSettings: config.load(),
    defaultSettings: defaultSettings,
    title: 'Settings'
  };
  res.render('settings/index.html', locals);
};

/**
 * POST
 */
SettingsController.prototype.update = function(req, res) {
  try {
    var updatedSetting = defaultSettings[req.body.settingKey];
    var settingValue = req.body.settingValue;
    if (updatedSetting.type === 'integer') {
      settingValue = parseInt(settingValue); // parse string from the dom to int for storage
    } else if (updatedSetting.type === 'object' || updatedSetting.type === 'array') {
      settingValue = JSON.parse(settingValue);
    }
    config.set(req.body.settingKey, settingValue);
    config.save(function (err) {
      if (err) {
        res.status(500).send({ error: 'Failed to update '+req.body.settingKey+': '+ err.message });
      } else {
        res.send(JSON.stringify({success:true}));
      }
    });
  } catch(err) {
    res.status(500).send({ error: 'Failed to update '+req.body.settingKey+': '+ err.message });
  }
};

module.exports = SettingsController;