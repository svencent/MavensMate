'use strict';

var express         = require('express');
var router          = express.Router();
var logger          = require('winston');
var requestStore    = require('../lib/request-store');

// required for cors
router.options('/', function(req, res) {
  return res.sendStatus(200);
});

router.post('/', _execute);
router.get('/', _execute);

router.get('/:id', function(req, res) {
  var requestId;
  var requestStore = req.app.get('requestStore');
  requestId = req.params.id;
  if (requestStore.isRequestComplete(requestId)) {
    res.send(requestStore.getResultForId(requestId));
  } else {
    return res.send({
      status: 'pending',
      id: requestId
    });
  }
});

function _execute(req, res) {
  var commandExecutor = req.app.get('commandExecutor');
  var command = req.body.command || req.query.command;
  var request = commandExecutor.execute({
    project: req.project,
    name: command,
    body: req.body,
    editor: req.editor
  });
  if (req.query.async === '1') {
    var requestStore = req.app.get('requestStore');
    var requestId = requestStore.add(request);
    return res.send({
      'status': 'pending',
      'id': requestId
    });
  } else {
    request
      .then(function(response) {
        return res.send(response);
      })
      .catch(function(err) {
        return res.send(err);
      });
  }
}

module.exports = router;