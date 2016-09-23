var path = require('path');

/**
 * Returns base name of the folder (e.g. path/to/src/documents/foldername/foo.txt -> foldername)
 * Currently, salesforce does not support folders nested deeper than 1 level
 * @return {String}
 */
module.exports.getDocumentFolderBaseName = function(d) {
  var folderPath = path.dirname(d.getPath());
  return path.basename(folderPath);
};

module.exports.getDocumentPackageXmlName = function(d) {
  if (d.getDescribe().inFolder) {
    if (d.getType() === 'Document') {
      return this.getDocumentFolderBaseName() + '/' + d.getName() + '.' + d.getExtension();
    } else {
      return this.getDocumentFolderBaseName() + '/' + d.getName();
    }
  } else {
    return d.getName();
  }
};