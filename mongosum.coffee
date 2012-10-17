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

	criteria = collection: @name
	console.log 'get schema', criteria

	@db.schema.find(criteria).next (err, schema = {}) ->
		console.lgo 'got schema', err, schema
		callback err, schema

Collection.prototype._insert = Collection.prototype.insert
Collection.prototype.insert = (object, callback) ->
	cb = (err, data, schema) ->
		# update schema
		callback and callback err, data

	update_schema = (data) ->
		console.log 'INSERTED', data

	@getSchema (err, schema) ->
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

module.exports = Server
