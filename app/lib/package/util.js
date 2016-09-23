var path = require('path');

/**
 * Returns base name of the folder (e.g. path/to/src/documents/foldername/foo.txt -> foldername)
 * Currently, salesforce does not support folders nested deeper than 1 level
 * @return {String}
 */
module.exports.getComponentFolderBaseName = function(c) {
  var folderPath = path.dirname(c.getPath());
  return path.basename(folderPath);
};

module.exports.getComponentPackageXmlName = function(c) {
  if (c.getDescribe().inFolder) {
    if (c.getType() === 'Document') {
      return this.getComponentFolderBaseName() + '/' + c.getName() + '.' + c.getExtension();
    } else {
      return this.getComponentFolderBaseName() + '/' + c.getName();
    }
  } else {
    return c.getName();
  }
};