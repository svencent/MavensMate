'use strict';

var express         = require('express');
var router          = express.Router();
var logger          = require('winston');
var requestStore    = require('../lib/request-store');

// required for cors
router.options('/', function(req, res) {
  return res.sendStatus(200);
});

router.get('/', function(req, res) {
  var requestId;
  var requestStore = req.app.get('requestStore');
  requestId = req.query.id;
  if (requestStore.isRequestComplete(requestId)) {
    res.send(requestStore.getResultForId(requestId));
  } else {
    return res.send({
      status: 'pending',
      id: requestId
    });
  }
});

module.exports = router;