'use strict';

/* global process */
/**
 * @file MavensMate API
 * @author Joe Ferraro <ferraro.joseph@gmail.com>
 */
// exports.Connection = require('./connection');
// exports.OAuth2 = require('./oauth2');
// exports.Date = exports.SfDate = require("./date");
// exports.RecordStream = require('./record-stream');

// var path = require('path');
// var up = require('underscore-plus');
// var fs = require('fs');

var mavensmate = exports;
mavensmate.createClient = require('./mavensmate/client').createClient;
