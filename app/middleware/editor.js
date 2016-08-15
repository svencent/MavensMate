/**
 * Middleware to attach editor
 */
module.exports = function(req, res, next) {
  if (req.url.indexOf('/app/static') >= 0) {
    return next();
  }
  req.editor = req.query.editor || req.body.editor || req.get('mavensmate-editor-agent'); // atom, sublime, vscode, etc.
  req.pid = req.query.pid || req.body.pid || req.get('mavensmate-pid');
  res.locals.editor = req.editor;
  next();
};