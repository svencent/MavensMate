'use strict';

var express         = require('express');
var router          = express.Router();
var fs              = require('fs');
var util            = require('../lib/util').instance;
var path            = require('path');
var logger          = require('winston');
var config          = require('../lib/config');
var defaultSettings = require('../config/default');

router.get('/', function(req, res) {
  var userSettings;
  try {
    userSettings = config.load();
  } catch(e) {
    logger.error('Could not load user settings', e);
    userSettings = defaultSettings;
  }
  var locals = {
    userSettings: userSettings,
    defaultSettings: defaultSettings,
    title: 'Settings'
  };
  res.render('settings/index.html', locals);
});

router.post('/', function(req, res) {
  try {
    var updatedSetting = defaultSettings[req.body.settingKey];
    var settingValue = req.body.settingValue;
    if (updatedSetting.type === 'integer') {
      settingValue = parseInt(settingValue); // parse string from the dom to int for storage
    } else if (updatedSetting.type === 'object' || updatedSetting.type === 'array') {
      settingValue = JSON.parse(settingValue);
    } else if (updatedSetting.type === 'string' && settingValue[0] === '"' && settingValue[settingValue.length - 1] === '"') {
      return res.status(500).send({ error: 'Failed to update '+req.body.settingKey+': Invalid string setting value. You should not wrap your string setting value in quotes.' });
    }
    config.set(req.body.settingKey, settingValue);
    config.save(function(err) {
      if (err) {
        res.status(500).send({ error: 'Failed to update '+req.body.settingKey+': '+ err.message });
      } else {
        res.send(JSON.stringify({success:true}));
      }
    });
  } catch(err) {
    res.status(500).send({ error: 'Failed to update '+req.body.settingKey+': '+ err.message });
  }
});

module.exports = router;