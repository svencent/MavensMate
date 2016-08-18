module.exports = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', ['Content-Type', 'X-Requested-With', 'MavensMate-Editor-Agent']);
  next();
};