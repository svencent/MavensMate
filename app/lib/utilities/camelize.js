module.exports = function(str) {
  if (str) {
    return str.replace(/[_-]+(\w)/g, function(m) {
      return m[1].toUpperCase();
    });
  } else {
    return '';
  }
}