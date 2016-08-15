var path = require('path');

module.exports = function(req, res, next) {
  var swig = req.app.get('swig');
  swig.setDefaults({ runInVm: true, loader: swig.loaders.fs(path.join(path.dirname(__dirname))) });
  next();
};