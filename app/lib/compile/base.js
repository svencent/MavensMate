function BaseCompiler(project, paths, force) {
  this._project = project;
  this._paths = paths;
  this._force = force;
}

module.exports = BaseCompiler;