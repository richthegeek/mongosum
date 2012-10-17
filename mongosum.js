// Generated by CoffeeScript 1.3.3
(function() {
  var Collection, DB, Server, collection_name, get_schema, merge_schema, walk_objects,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Server = require('mongolian');

  DB = require('mongolian/lib/db.js');

  Collection = require('mongolian/lib/collection.js');

  collection_name = 'schemas';

  Server.prototype.db = function(name) {
    if (!(this._dbs[name] != null)) {
      this._dbs[name] = new DB(this, name);
      this._dbs[name].schema = new Collection(this._dbs[name], collection_name);
    }
    return this._dbs[name];
  };

  DB.prototype.collection = function(name) {
    return this._collections[name] || (this._collections[name] = new Collection(this, name));
  };

  Collection.prototype.getSchema = function(callback) {
    var criteria;
    if (this.name === collection_name) {
      throw 'MongoSum cannot get the schema of the schemas collection.';
    }
    criteria = {
      _collection: this.name
    };
    console.log('get schema', criteria);
    return this.db.schema.find(criteria).next(function(err, schema) {
      if (schema == null) {
        schema = {};
      }
      console.log('got schema', err, schema);
      return callback(err, schema);
    });
  };

  Collection.prototype.setSchema = function(schema, callback) {
    var criteria;
    if (this.name === collection_name) {
      throw 'MongoSum cannot set the schema of the schemas collection';
    }
    criteria = {
      _collection: this.name
    };
    schema._collection = this.name;
    return this.db.schema.update(criteria, schema, true, callback);
  };

  Collection.prototype._insert = Collection.prototype.insert;

  Collection.prototype.insert = function(object, callback) {
    var cb, complete, obj, schema, schema_change_count, update_schema, _i, _len, _results,
      _this = this;
    if (this.name === collection_name) {
      return Collection.prototype._insert.apply(this, arguments);
    }
    cb = function(err, data, schema) {
      if (schema_change_count > 0) {
        return _this.getSchema(function(err, full_schema) {
          full_schema = merge_schema(full_schema, schema, {
            sum: function(a, b) {
              return {
                $inc: (b !== null ? b : a)
              };
            }
          });
          console.log('full', full_schema);
          throw 'NO MORE';
          return _this.setSchema(full_schema, function() {
            return callback && callback(err, data);
          });
        });
      } else {
        return callback && callback(err, data);
      }
    };
    schema = {};
    schema_change_count = 0;
    update_schema = function(data) {
      schema_change_count++;
      return merge_schema(schema, get_schema(data));
    };
    if (Object.prototype.toString.call(object) === '[object Array]') {
      complete = 0;
      _results = [];
      for (_i = 0, _len = object.length; _i < _len; _i++) {
        obj = object[_i];
        _results.push(this._insert(obj, function(err, data) {
          if (!err) {
            update_schema(data);
          }
          if (++complete === object.length) {
            return cb(err, data, schema);
          }
        }));
      }
      return _results;
    } else {
      return this._insert(object, function(err, data) {
        if (!err) {
          update_schema(data);
        }
        return cb(err, data, schema);
      });
    }
  };

  Collection.prototype._update = Collection.prototype.update;

  Collection.prototype.update = function(criteria, object, upsert, multi, callback) {
    if (this.name === collection_name) {
      return Collection.prototype._update.apply(this, arguments);
    }
    console.log('update');
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
    return this._update(criteria, object, upsert, multi, function(err, data) {
      try {
        an.update.occurred++;
      } catch (e) {
        console.log(e.stack);
      }
      return callback && callback.apply(this, arguments);
    });
  };

  get_schema = function(object) {
    return walk_objects(object, {}, function(key, vals, types) {
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

  merge_schema = function(left, right, options) {
    var _ref, _ref1, _ref2;
    if (options == null) {
      options = {};
    }
    if ((_ref = options.sum) == null) {
      options.sum = function(a, b) {
        return a + b;
      };
    }
    if ((_ref1 = options.min) == null) {
      options.min = Math.min;
    }
    if ((_ref2 = options.max) == null) {
      options.max = Math.max;
    }
    return walk_objects(left, right, function(key, vals, types) {
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

  walk_objects = function(object, second, fn) {
    var ignore, k, key, keys, type1, type2, v, v1, v2, _i, _j, _len, _len1;
    if (second == null) {
      second = {};
    }
    keys = (function() {
      var _results;
      _results = [];
      for (k in object) {
        v = object[k];
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
    ignore = ['_c', '_h', '_id', '_t'];
    for (_i = 0, _len = keys.length; _i < _len; _i++) {
      key = keys[_i];
      if (!(__indexOf.call(ignore, key) < 0)) {
        continue;
      }
      v1 = object[key];
      v2 = second[key];
      type1 = (v1 && v1.constructor.name) || 'Null';
      type2 = (v2 && v2.constructor.name) || 'Null';
      if ((type1 === 'Object' || type1 === 'Array') && !(v1.type != null)) {
        object[key] = walk_objects(v1, v2, fn);
      } else {
        object[key] = fn(key, [v1, v2], [type1, type2]);
      }
    }
    for (_j = 0, _len1 = ignore.length; _j < _len1; _j++) {
      key = ignore[_j];
      if (object[key] != null) {
        delete object[key];
      }
    }
    return object;
  };

  module.exports = Server;

}).call(this);
