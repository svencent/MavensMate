'use strict';

var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
  if (req.project) {
    res.redirect('/app/project/'+req.project.settings.id+'?pid='+req.project.settings.id); //todo: deal with param vs query goofiness
  } else {
    res.render('home/index.html', {
      title: 'MavensMate Home'
    });
  }
});

module.exports = router;