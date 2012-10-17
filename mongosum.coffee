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

	@db.schema.find criteria, (err, schema = {}) ->
		callback err, schema

Collection.prototype._insert = Collection.prototype.insert
Collection.prototype.insert = (object, callback) ->
	if Object::toString.call(object) is '[object Array]'
		complete = 0
		for obj in object
			@insert obj, (err, data) ->
				complete++
				if complete is object.length
					callback and callback.apply this, arguments
	else
		@_insert object, (err, data) ->
			console.log 'inserted'
			console.log '    ', err
			console.log '    ', data
			callback and callback.apply this, arguments

module.exports = Server
