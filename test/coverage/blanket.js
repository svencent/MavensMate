var path = require('path');
var libDir = path.join(__dirname, '..', '..', 'lib');

require('blanket')({
  // Only files that match the pattern will be instrumented
  pattern: libDir
});