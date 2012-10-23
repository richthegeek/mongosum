// Generated by CoffeeScript 1.3.3
(function() {
  var Collection, DB, Server, collection_name,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Server = require('mongolian');

  DB = require('mongolian/lib/db.js');

  Collection = require('mongolian/lib/collection.js');

  collection_name = '_summaries';

  Server.prototype.defaultSummaryOptions = function(opts) {
    var _base, _base1, _base2, _base3, _ref, _ref1, _ref2, _ref3;
    this._defaultSummaryOptions = opts || this._defaultSummaryOptions || {};
    if ((_ref = (_base = this._defaultSummaryOptions).ignored_columns) == null) {
      _base.ignored_columns = ['_id'];
    }
    if ((_ref1 = (_base1 = this._defaultSummaryOptions).track_column) == null) {
      _base1.track_column = function(column, options) {
        return __indexOf.call(options.ignored_columns, column) < 0;
      };
    }
    if ((_ref2 = (_base2 = this._defaultSummaryOptions).ignored_collections) == null) {
      _base2.ignored_collections = [];
    }
    if ((_ref3 = (_base3 = this._defaultSummaryOptions).track_collection) == null) {
      _base3.track_collection = function(collection, options) {
        var _ref4;
        return _ref4 = !collection, __indexOf.call(options.ignored_collections, _ref4) >= 0;
      };
    }
    return this._defaultSummaryOptions;
  };

  DB.prototype.defaultSummaryOptions = function() {
    return this.server.defaultSummaryOptions.apply(this, arguments);
  };

  Collection.prototype.defaultSummaryOptions = function() {
    return this.db.server.defaultSummaryOptions.apply(this, arguments);
  };

  Server.prototype.db = function(name) {
    if (!(this._dbs[name] != null)) {
      this._dbs[name] = new DB(this, name);
      this._dbs[name].summary = new Collection(this._dbs[name], collection_name);
    }
    return this._dbs[name];
  };

  DB.prototype.collection = function(name) {
    return this._collections[name] || (this._collections[name] = new Collection(this, name));
  };

  Collection.prototype.getSummaryOptions = function(callback) {
    var _this = this;
    if (!this._summaryOptions) {
      return this.getSummary(function(err, summary) {
        summary._options = _this.defaultSummaryOptions(summary._options || {});
        return callback(_this._summaryOptions = summary._options);
      });
    } else {
      return callback(this._summaryOptions);
    }
  };

  Collection.prototype.setSummaryOptions = function(options, callback) {
    var _this = this;
    return this.getSummary(function(err, summary) {
      summary._options = options;
      return _this.setSummary(summary, callback);
    });
  };

  /*
  # Retrieve the summary for this collection
  */


  Collection.prototype.getSummary = function(callback) {
    var criteria,
      _this = this;
    if (this.name === collection_name) {
      throw 'MongoSum cannot get the summary of the summarys collection.';
    }
    criteria = {
      _collection: this.name
    };
    return this.db.summary.find(criteria).next(function(err, summary) {
      var _ref, _ref1, _ref2;
      if (summary == null) {
        summary = {};
      }
      if ((_ref = summary._collection) == null) {
        summary._collection = _this.name;
      }
      if ((_ref1 = summary._options) == null) {
        summary._options = _this.defaultSummaryOptions();
      }
      if ((_ref2 = summary._length) == null) {
        summary._length = 0;
      }
      _this._summaryOptions = summary._options;
      return callback(err, summary);
    });
  };

  /*
  # Set the summary for this collection (used internally)
  */


  Collection.prototype.setSummary = function(summary, callback) {
    var criteria;
    if (this.name === collection_name) {
      throw 'MongoSum cannot set the summary of the summarys collection';
    }
    criteria = {
      _collection: this.name
    };
    summary._collection = this.name;
    summary._updated = +(new Date);
    return this.db.summary.update(criteria, summary, true, callback);
  };

  /*
  # Do a full-table update of the summary. This is expensive.
  */


  Collection.prototype.rebuildSummary = function(callback) {
    var _this = this;
    return this.getSummaryOptions(function(options) {
      var each, summary;
      summary = {
        _collection: _this.name,
        _options: options,
        _length: 0
      };
      each = function(object) {
        summary._length++;
        return _this._merge_summary(summary, _this._get_summary(object));
      };
      return _this.find().forEach(each, function() {
        return _this.setSummary(summary, callback);
      });
    });
  };

  /*
  # INTERNAL. Merge summary, save it, and fire the callback.
  */


  Collection.prototype._merge_summarys = function(err, data, callback, options, summary) {
    var _this = this;
    return this.getSummary(function(err, full_summary) {
      full_summary._length += summary._length;
      full_summary = _this._merge_summary(full_summary, summary, options);
      return _this.setSummary(full_summary, function() {
        return callback && callback(err, data);
      });
    });
  };

  Collection.prototype._drop = Collection.prototype.drop;

  Collection.prototype.drop = function() {
    this.db.summary.remove({
      _collection: this.name
    });
    return this._drop.apply(this, arguments);
  };

  Collection.prototype._insert = Collection.prototype.insert;

  Collection.prototype.insert = function(object, callback) {
    var summary, update_summary,
      _this = this;
    if (this.name === collection_name) {
      return Collection.prototype._insert.apply(this, arguments);
    }
    summary = {
      _length: 0
    };
    update_summary = function(err, data) {
      if (!err) {
        return _this._merge_summary(summary, _this._get_summary(data));
      }
    };
    if (Object.prototype.toString.call(object) !== '[object Array]') {
      object = [object];
    }
    return this.getSummaryOptions(function() {
      var complete, obj, track, _i, _len, _results;
      track = _this._summaryOptions.track_collection(_this.name, _this._summaryOptions);
      complete = 0;
      _results = [];
      for (_i = 0, _len = object.length; _i < _len; _i++) {
        obj = object[_i];
        _results.push(_this._insert(obj, function(err, data) {
          update_summary(err, data);
          summary._length++;
          if (++complete === object.length) {
            return _this._merge_summarys(err, data, callback, {}, summary);
          }
        }));
      }
      return _results;
    });
  };

  Collection.prototype._update = Collection.prototype.update;

  Collection.prototype.update = function(criteria, object, upsert, multi, callback) {
    var merge_opts, options, subtract_summary, summary, update_summary,
      _this = this;
    if (this.name === collection_name) {
      return Collection.prototype._update.apply(this, arguments);
    }
    if (!callback && typeof multi === 'function') {
      callback = multi;
      multi = false;
    }
    if (!callback && typeof upsert === 'function') {
      callback = upsert;
      upsert = false;
    }
    if (callback && typeof callback !== 'function') {
      throw 'Callback is not a function!';
    }
    summary = {
      _length: 0
    };
    subtract_summary = function(err, data) {
      if (!err && data) {
        return _this._merge_summary(summary, _this._get_summary(data), {
          sum: function(a, b) {
            return (b === null && -a) || (a - b);
          },
          min: function(a, b) {
            return a;
          },
          max: function(a, b) {
            return a;
          }
        });
      }
    };
    update_summary = function(err, data) {
      if (!err && data) {
        return _this._merge_summary(summary, _this._get_summary(data));
      }
    };
    if (Object.prototype.toString.call(object) !== '[object Array]') {
      object = [object];
    }
    if (multi !== true) {
      object = [object.shift()];
    }
    options = {
      remove: false,
      "new": true,
      upsert: !!upsert
    };
    merge_opts = {
      min: function(a, b) {
        if (isNaN(parseInt(a)) || (b === a)) {
          throw 'FULL UPDATE';
        }
        return Math.min(a, b);
      },
      max: function(a, b) {
        if (isNaN(parseInt(a)) || (b === a)) {
          throw 'FULL UPDATE';
        }
        return Math.max(a, b);
      }
    };
    return this.getSummaryOptions(function() {
      return _this.find(criteria).toArray(function(err, _originals) {
        var complete, for_merge, o, obj, opts, originals, _i, _j, _len, _len1, _results;
        if (_originals == null) {
          _originals = [];
        }
        originals = {};
        for (_i = 0, _len = _originals.length; _i < _len; _i++) {
          o = _originals[_i];
          originals[o._id.toString()] = o;
        }
        for_merge = [];
        complete = 0;
        _results = [];
        for (_j = 0, _len1 = object.length; _j < _len1; _j++) {
          obj = object[_j];
          opts = {
            criteria: criteria,
            update: obj,
            options: options,
            remove: false,
            "new": true,
            upsert: !!upsert
          };
          _results.push(_this.findAndModify(opts, function(err, data) {
            var _k, _len2;
            if (!err && data) {
              subtract_summary(err, originals[data._id.toString()]);
              if (!err) {
                for_merge.push(data);
              }
              if (++complete === object.length) {
                try {
                  for (_k = 0, _len2 = for_merge.length; _k < _len2; _k++) {
                    data = for_merge[_k];
                    update_summary(null, data);
                  }
                  return _this._merge_summarys(err, data, callback, merge_opts, summary);
                } catch (e) {
                  if (e === 'FULL UPDATE') {
                    return _this.updateSummary(callback);
                  } else {
                    throw e;
                  }
                }
              }
            }
          }));
        }
        return _results;
      });
    });
  };

  Collection.prototype._remove = Collection.prototype.remove;

  Collection.prototype.remove = function(criteria, callback) {
    var merge_opts, subtract_summary, summary, summary_options,
      _this = this;
    if (this.name === collection_name) {
      return Collection.prototype._update.apply(this, arguments);
    }
    if (!callback && typeof criteria === 'function') {
      callback = criteria;
      criteria = {};
    }
    summary = {
      _length: 0
    };
    summary_options = null;
    subtract_summary = function(err, data) {
      if (!err && data) {
        return _this._merge_summary(summary, _this._get_summary(data), {
          sum: function(a, b) {
            return (b === null && -a) || (a - b);
          },
          min: function(a, b) {
            return a;
          },
          max: function(a, b) {
            return a;
          }
        });
      }
    };
    merge_opts = {
      min: function(a, b) {
        if (isNaN(parseInt(a)) || (b === a)) {
          throw 'FULL UPDATE';
        }
        return Math.min(a, b);
      },
      max: function(a, b) {
        if (isNaN(parseInt(a)) || (b === a)) {
          throw 'FULL UPDATE';
        }
        return Math.max(a, b);
      }
    };
    return this.getSummaryOptions(function() {
      return _this.find(criteria).toArray(function(err, data) {
        var row, _i, _len;
        data = data || [];
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          row = data[_i];
          summary._length--;
          subtract_summary(err, row);
        }
        try {
          _this._merge_summarys(err, data, (function() {
            return null;
          }), merge_opts, summary);
          return _this._remove(criteria, callback);
        } catch (e) {
          if (e === 'FULL UPDATE') {
            return _this.updateSummary(callback);
          } else {
            throw e;
          }
        }
      });
    });
  };

  Collection.prototype._get_summary = function(object) {
    return this._walk_objects(object, {}, {}, function(key, vals, types) {
      var ret;
      ret = {};
      ret.type = types[0];
      ret.example = vals[0];
      if (types[0] === 'Number' || (vals[0] = parseInt(vals[0], 10))) {
        ret.min = ret.max = ret.sum = vals[0];
      }
      return ret;
    });
  };

  Collection.prototype._merge_summary = function(left, right, options) {
    var _ref, _ref1, _ref2;
    if (options == null) {
      options = {};
    }
    if ((_ref = options.sum) == null) {
      options.sum = function(a, b) {
        return (parseInt(a, 10) + parseInt(b, 10)) || a;
      };
    }
    if ((_ref1 = options.min) == null) {
      options.min = Math.min;
    }
    if ((_ref2 = options.max) == null) {
      options.max = Math.max;
    }
    return this._walk_objects(left, right, {}, function(key, vals, types) {
      if (!vals[0] && vals[1]) {
        vals[0] = JSON.parse(JSON.stringify(vals[1]));
        if (vals[1].sum) {
          vals[1].sum = null;
        }
      }
      if ((vals[0] != null) && vals[0].type) {
        if (vals[0].type === 'Number' && vals[1].type === 'Number') {
          vals[0].min = options.min(vals[0].min, vals[1].min);
          vals[0].max = options.max(vals[0].max, vals[1].max);
          vals[0].sum = options.sum(vals[0].sum, vals[1].sum);
        }
        vals[0].example = (vals[1] && vals[1].example) || vals[0].example;
      }
      return vals[0];
    });
  };

  Collection.prototype._walk_objects = function(first, second, options, fn) {
    var k, key, keys, type, v, v1, v2, val, _i, _len, _ref;
    if (second == null) {
      second = {};
    }
    keys = (function() {
      var _results;
      _results = [];
      for (k in first) {
        v = first[k];
        _results.push(k);
      }
      return _results;
    })();
    for (k in second) {
      v = second[k];
      if (__indexOf.call(keys, k) < 0) {
        keys.push(k);
      }
    }
    for (_i = 0, _len = keys.length; _i < _len; _i++) {
      key = keys[_i];
      if (!(this._summaryOptions.track_column(key, this._summaryOptions))) {
        continue;
      }
      v1 = first[key];
      v2 = second[key];
      type = function(o) {
        return ((o != null) && o.constructor && o.constructor.name) || 'Null';
      };
      if (((_ref = type(v1)) === 'Object' || _ref === 'Array') && !(v1.type != null)) {
        first[key] = this._walk_objects(v1, v2, options, fn);
      } else {
        first[key] = fn(key, [v1, v2], [type(v1), type(v2)]);
      }
    }
    for (key in first) {
      val = first[key];
      if (!this._summaryOptions.track_column(key, this._summaryOptions)) {
        delete first[key];
      }
    }
    return first;
  };

  module.exports = Server;

}).call(this);
