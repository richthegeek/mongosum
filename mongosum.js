// Generated by CoffeeScript 1.3.3
(function() {
  var Collection, DB, Server;

  Server = require('mongolian');

  DB = require('mongolian/lib/db.js');

  Collection = require('mongolian/lib/collection.js');

  Server.prototype.db = function(name) {
    if (!(this._dbs[name] != null)) {
      this._dbs[name] = new DB(this, name);
      this._dbs[name].schema = new Collection(this._dbs[name], 'schemas');
    }
    return this._dbs[name];
  };

  DB.prototype.collection = function(name) {
    return this._collections[name] || (this._collections[name] = new Collection(this, name));
  };

  Collection.prototype.getSchema = function(callback) {
    var criteria;
    if (this.name === 'schemas') {
      throw 'MongoSum cannot get the schema of the schemas collection.';
    }
    criteria = {
      collection: this.name
    };
    console.log('get schema', criteria);
    return this.db.schema.find(criteria).next(function(err, schema) {
      if (schema == null) {
        schema = {};
      }
      console.lgo('got schema', err, schema);
      return callback(err, schema);
    });
  };

  Collection.prototype._insert = Collection.prototype.insert;

  Collection.prototype.insert = function(object, callback) {
    var cb, update_schema;
    cb = function(err, data, schema) {
      return callback && callback(err, data);
    };
    update_schema = function(data) {
      return console.log('INSERTED', data);
    };
    return this.getSchema(function(err, schema) {
      var complete, obj, _i, _len, _results;
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
    });
  };

  module.exports = Server;

}).call(this);
