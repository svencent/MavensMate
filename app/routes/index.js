var express = require('express');
var router = express.Router();

// important: this route is configured in the connected app,
// so we have to handle that URL here and redirect to a proper route
router.get('/sfdc/auth/callback', function(req, res) {
  res.redirect('/app/auth/callback');
});

router.get('/', function(req, res) {
  res.redirect('/app/home');
});

// rpc route
router.use('/execute', require('./execute'));

// deprecated route, used to support atom/sublime plugins that have not yet updated mavensmate desktop
router.use('/status', require('./status'));

// todo: add middleware that throws 500 if no project context sent for project-specific routes
router.use('/app/auth',require('./auth'));
router.use('/app/apex',require('./apex'));
router.use('/app/connections',require('./connections'));
router.use('/app/deploy',require('./deploy'));
router.use('/app/home',require('./home'));
router.use('/app/lightning',require('./lightning'));
router.use('/app/logs',require('./logs'));
router.use('/app/metadata',require('./metadata'));
router.use('/app/project',require('./project'));
router.use('/app/settings',require('./settings'));
router.use('/app/test',require('./test'));

// if we have an unhandled route, we throw a 404 if it's ajax, otherwise we return our 404.html
router.get('*', function(req, res){
  var isAjaxRequest = req.xhr;
  if (isAjaxRequest) {
    res.send('URL not found: '+req.url, 404);
  } else {
    res.render('404.html', {
      title: '404: Page not found'
    });
  }
});

module.exports = router;