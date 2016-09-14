module.exports = function(req, res, next) {
  if (req.app.get('mode') === 'desktop' && req.app.get('desktopVersion')) {
    res.header('MavensMate-Desktop-Version', req.app.get('desktopVersion'));
  }
  next();
};