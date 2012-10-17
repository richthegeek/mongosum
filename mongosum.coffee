Server = require 'mongolian'
DB = require 'mongolian/lib/db.js'
Collection = require 'mongolian/lib/collection.js'

collection_name = 'schemas'

Server.prototype.db = (name) ->
	if not @_dbs[name]?
		@_dbs[name] = new DB @, name
		@_dbs[name].schema = new Collection @_dbs[name], collection_name
	return @_dbs[name]

DB.prototype.collection = (name) ->
	return @_collections[name] or (@_collections[name] = new Collection @, name)

Collection.prototype.getSchema = (callback) ->
	if @name is collection_name
		throw 'MongoSum cannot get the schema of the schemas collection.'

	criteria = _collection: @name
	console.log 'get schema', criteria

	@db.schema.find(criteria).next (err, schema = {}) ->
		console.log 'got schema', err, schema
		callback err, schema

Collection.prototype.setSchema = (schema, callback) ->
	if @name is collection_name
		throw 'MongoSum cannot set the schema of the schemas collection'

	criteria = _collection: @name
	schema._collection = @name
	@db.schema.update criteria, schema, true, callback

Collection.prototype._merge_schemas = (err, data, callback, options, schema, schema_change_count) ->
	if schema_change_count > 0
		@getSchema (err, full_schema) =>
			full_schema = merge_schema full_schema, schema, options
			@setSchema full_schema, () ->
				callback and callback err, data
	else
		callback and callback err, data

Collection.prototype._insert = Collection.prototype.insert
Collection.prototype.insert = (object, callback) ->
	if @name is collection_name
		return Collection.prototype._insert.apply this, arguments

	[schema, schema_change_count]  = [{}, 0]
	update_schema = (err, data) ->
		if not err
			schema_change_count++
			merge_schema schema, get_schema data

	if Object::toString.call(object) isnt '[object Array]'
		object = [object]

	complete = 0
	for obj in object
		@_insert obj, (err, data) =>
			update_schema err, data
			if ++complete is object.length
				@_merge_schemas err, data, callback, {}, schema, schema_change_count

Collection.prototype._update = Collection.prototype.update
Collection.prototype.update = (criteria, object, upsert, multi, callback) ->
	if @name is collection_name
		return Collection.prototype._update.apply this, arguments

	if not callback and typeof multi is 'function'
		callback = multi
		multi = false
	if not callback and typeof upsert is 'function'
		callback = upsert
		upsert = false
	if callback and typeof callback isnt 'function'
		throw 'Callback is not a function!'

	# Process for an update:
	# Do a find on the criteria specified
	# Do a findAndModify
	# If the update returns, subtract original and add updated
	[schema, schema_change_count]  = [{}, 0]
	subtract_schema = (err, data) ->
		if not err and data
			merge_schema schema, (get_schema data), {
				sum: (a, b) -> return (b is null and -a) or (a - b)
				min: (a, b) ->
					console.log 'min', a, b
					a
				max: (a, b) ->
					console.log 'max', a, b
					a
			}

	update_schema = (err, data) ->
		if not err and data
			schema_change_count++
			merge_schema schema, get_schema data

	if Object::toString.call(object) isnt '[object Array]'
		object = [object]

	if multi isnt true
		object = [object.shift()]

	options =
		remove: false
		new: true
		upsert: !! upsert

	merge_opts =
		min: (a, b) -> return (if b <= a then null else Math.min(a,b))
		max: (a, b) -> return (if b >= a then null else Math.max(a,b))

	@find(criteria).toArray (err, _originals = []) =>

		originals = {}
		originals[o._id.toString()] = o for o in _originals

		complete = 0
		for obj in object
			opts =
				criteria: criteria
				update: obj
				options: options
				remove: false
				new: true
				upsert: !!upsert

			@findAndModify opts, (err, data) =>
				console.log 'modified', data
				if not err and data
					subtract_schema err, originals[data._id.toString()]
					update_schema err, data
					if ++complete is object.length
						@_merge_schemas err, data, callback, merge_opts, schema, schema_change_count

get_schema = (object) ->
	walk_objects object, {}, (key, vals, types) ->
		ret = {}
		ret.type = types[0]
		ret.example = vals[0]
		if types[0] is 'Number' or vals[0] = parseInt vals[0], 10
			ret.min = ret.max = ret.sum = vals[0]
		return ret

merge_schema = (left, right, options = {}) ->
	options.sum ?= (a, b) -> return a + b
	options.min ?= Math.min
	options.max ?= Math.max

	walk_objects left, right, (key, vals, types) ->
		if not vals[0] and vals[1]
			vals[0] = JSON.parse JSON.stringify vals[1]
			if vals[1].sum then vals[1].sum = null
		if vals[0]? and vals[0].type
			if vals[0].type is 'Number' and vals[1].type is 'Number'
				vals[0].min = options.min vals[0].min, vals[1].min
				vals[0].max = options.max vals[0].max, vals[1].max
				vals[0].sum = options.sum vals[0].sum, vals[1].sum

			vals[0].example = (vals[1] and vals[1].example) or vals[0].example
		return vals[0]

walk_objects = (first, second = {}, fn) ->
	keys = (k for k,v of first)
	(keys.push k for k,v of second when k not in keys)

	ignore = ['_c', '_h', '_id', '_t']
	for key in keys when key not in ignore
		v1 = first[key]
		v2 = second[key]
		type = (o) -> (o? and o.constructor and o.constructor.name) or 'Null'

		if type(v1) in ['Object', 'Array'] and not v1.type?
			first[key] = walk_objects v1, v2, fn
		else
			first[key] = fn key, [v1, v2], [type(v1), type(v2)]
	delete first[key] for key in ignore
	return first


module.exports = Server
