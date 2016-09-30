module.exports.ensureParentsAreCheckedIfNecessary = function(orgMetadata) {
  _.each(orgMetadata, function(metadataType) {
    if (metadataType.children && _.isArray(metadataType.children)) {
      var numberOfChildrenSelected = 0;
      _.each(metadataType.children, function(c) {
        if (c.selected) {
          numberOfChildrenSelected++;
        }
      });
      if (metadataType.children.length === numberOfChildrenSelected && metadataType.children > 0) {
        metadataType.selected = true;
      }
    }
  });
};


module.exports.setVisibility = function(jsonData, query) {
  this._crawl(jsonData, 0, query.toLowerCase(), 0);
};

module.exports.setChecked = function(sourceArray, ids, dpth, key) {
  // Recursively find selected item
  var self = this;

  if (!key) key = '';
  if (!ids) ids = [];
  if (!dpth) dpth = 0;

  if (_.isArray(sourceArray)) {
    _.each(sourceArray, function(litem) {
      if (_.isObject(litem)) {
        if (_.has(litem, 'id') && ids.indexOf(litem.id) >= 0) {
          litem.selected = true;
        }
      }
      self.setChecked(litem, ids, dpth + 2);
    });
  } else if (_.isObject(sourceArray)) {
    _.forOwn(sourceArray, function(value, key) {
      self.setChecked(value, ids, dpth + 1, key);
    });
  }
};

/**
 * a number of protoype methods to crawl the org metadata index and select/deselect nodes
 */
module.exports._crawlDict = function(jsonData, depth, query, parentVisiblity) {
  var self = this;
  depth += 1;
  var visibility = 0;
  var childVisibility = 0;

  // if (!parentVisiblity) {
  //   parentVisiblity = 0;
  // }
  // console.log('crawling dict: ', jsonData);
  // console.log('parentVisiblity: ', parentVisiblity);

  _.forOwn(jsonData, function(value, key) {
    if (key === 'title') {
      // console.log('VALUE IS ---> ', value);
      // console.log('KEY IS ---> ', key);
      if (_.isString(value) && value.toLowerCase().indexOf(query) >= 0) {
        visibility = 1;
      } else if (!_.isObject(value) && !_.isArray(value) && value.toLowerCase().indexOf(query) >= 0) {
        visibility = 1;
      }
      // console.log(visibility);
    }
  });

  _.forOwn(jsonData, function(value, key) {
    if (self._crawl(value, depth, query, visibility) > 0) {
      childVisibility = 1;
    }
    if (visibility > childVisibility) {
      visibility = visibility;
    } else {
      visibility = childVisibility;
    }
  });

  jsonData.visibility = visibility;

  if (visibility === 0) {
    jsonData.cls = 'hidden';
    jsonData.addClass = 'dynatree-hidden';
  }

  return visibility;
};

module.exports._crawlArray = function(jsonData, depth, query, parentVisiblity) {
  var self = this;
  depth += 1;
  var elementsToRemove = [];
  var index = 0;
  var childVisibility;

  _.each(jsonData, function(value) {
    if (_.isString(value)) {
      childVisibility = value.toLowerCase().indexOf(query) >= 0;
    } else if (_.isObject(value)) {
      childVisibility = self._crawl(value, depth, query, parentVisiblity);
      value.index = index;
    } else {
      childVisibility = value.toLowerCase().indexOf(query) >= 0;
    }

    if (childVisibility === 0 && parentVisiblity === 0) {
      elementsToRemove.push(value);
      value.cls = 'hidden';
      value.addClass = 'dynatree-hidden';
    } else {
      if (value.isFolder) {
        value.expanded = true;
      }
    }

    index += 1;
  });
};

module.exports._crawl = function(jsonData, depth, query, parentVisiblity) {
  var self = this;
  if (_.isArray(jsonData)) {
    self._crawlArray(jsonData, depth, query, parentVisiblity);
    var hv = false;
    _.each(jsonData, function(jd) {
      if (_.has(jd, 'visibility') && jd.visibility === 1) {
        hv = true;
        return false;
      }
    });
    return hv;
  } else if (_.isObject(jsonData)) {
    return self._crawlDict(jsonData, depth, query, parentVisiblity);
  } else {
    return 0;
  }
};

module.exports._setThirdStateChecked = function(src, ids, dpth, key) {
  // Recursively find selected item
  var self = this;

  if (!key) key = '';
  if (!ids) ids = [];
  if (!dpth) dpth = 0;

  if (_.isArray(src)) {
    _.each(src, function(litem) {
      if (_.isObject(litem)) {
        return false;
      }
      self._setThirdStateChecked(litem, ids, dpth + 2);
    });
  } else if (_.isObject(src)) {
    if (_.has(src, 'children') && _.isArray(src.children) && src.children.length > 0) {
      var children = src.children;
      var numberOfPossibleChecked = children.length;
      var numberOfChecked = 0;
      _.each(children, function(c) {
        if (_.has(c, 'selected') && c.selected) {
          numberOfChecked += 1;
        }
      });
      if (numberOfPossibleChecked === numberOfChecked) {
        src.selected = true;
      } else if (numberOfChecked > 0) {
        src.cls = 'x-tree-checkbox-checked-disabled';
      }
    }

    _.forOwn(src, function(value, key) {
      self._setThirdStateChecked(value, ids, dpth + 1, key);
    });
  }
};