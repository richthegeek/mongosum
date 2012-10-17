Server = require 'mongolian'
DB = require 'mongolian/lib/db.js'
Collection = require 'mongolian/lib/collection.js'

Server.prototype.db = (name) ->
	if not @_dbs[name]?
		@_dbs[name] = new DB @, name
		@_dbs[name].schema = new Collection @_dbs[name], 'schemas'
	return @_dbs[name]

DB.prototype.collection = (name) ->
	return @_collections[name] or (@_collections[name] = new Collection @, name)

Collection.prototype.getSchema = (callback) ->
	if @name is 'schemas'
		throw 'MongoSum cannot get the schema of the schemas collection.'

	criteria = _collection: @name
	console.log 'get schema', criteria

	@db.schema.find(criteria).next (err, schema = {}) ->
		console.log 'got schema', err, schema
		callback err, schema

Collection.prototype.setSchema = (schema, callback) ->
	if @name is 'schemas'
		throw 'MongoSum cannot set the schema of the schemas collection'

	criteria = _collection: @name
	schema._collection = @name
	@db.schema.update criteria, schema, true

Collection.prototype._insert = Collection.prototype.insert
Collection.prototype.insert = (object, callback) ->
	if @name is 'schemas'
		return

	cb = (err, data, schema) =>
		if schema_change_count > 0
			@getSchema (err, full_schema) =>
				full_schema = merge_schema full_schema, schema
				@setSchema full_schema, () ->
					callback and callback err, data
		else
			callback and callback err, data

	schema = {}
	schema_change_count = 0

	update_schema = (data) ->
		schema_change_count++
		s = get_schema data
		merge_schema schema, s

		console.log s, schema, schema_change_count
		console.log '\n'

	if Object::toString.call(object) is '[object Array]'
		complete = 0
		for obj in object
			@_insert obj, (err, data) ->
				if not err
					update_schema data

				if ++complete is object.length
					cb err, data, schema
	else
		@_insert object, (err, data) ->
			if not err
				update_schema data
			cb err, data, schema


get_schema = (object) ->
	walk_objects object, {}, (key, vals, types) ->
		ret = {}
		ret.type = types[0]
		ret.example = vals[0]
		if types[0] is 'Number' or vals[0] = parseInt vals[0], 10
			ret.min = ret.max = ret.sum = vals[0]
		return ret

merge_schema = (left, right) ->
	walk_objects left, right, (key, vals, types) ->
		if not vals[0] and vals[1]
			vals[0] = vals[1]
			vals[1].sum = vals[1].sum * 0.5
		if vals[0]? and vals[0].type
			if vals[0].type is 'Number'
				if vals[1].min and vals[1].max and vals[1].sum
					vals[0].min = Math.min vals[0].min, vals[1].min
					vals[0].max = Math.max vals[0].max, vals[1].max
					vals[0].sum = vals[0].sum + vals[1].sum

			vals[0].example = (vals[1] and vals[1].example) or vals[0].example
		return vals[0]

walk_objects = (object, second = {}, fn) ->
	keys = (k for k,v of object)
	(keys.push k for k,v of second when k not in keys)

	ignore = ['_c', '_h', '_id', '_t']
	for key in keys when key not in ignore
		v1 = object[key]
		v2 = second[key]
		type1 = (v1 and v1.constructor.name) or 'Null'
		type2 = (v2 and v2.constructor.name) or 'Null'

		if type1 in ['Object', 'Array'] and not v1.type?
			object[key] = walk_objects v1, v2, fn
		else
			object[key] = fn key, [v1, v2], [type1, type2]
	for key in ignore when object[key]?
		delete object[key]
	return object


module.exports = Server
