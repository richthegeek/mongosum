Server = require 'mongolian'
DB = require 'mongolian/lib/db.js'
Collection = require 'mongolian/lib/collection.js'

Server.prototype.db = (name) ->
	if not @_dbs[name]?
		@_dbs[name] = new DB @, name
		@_dbs[name].schema = new Collection db, 'schemas'
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
	@_insert object, (err, data) ->
		console.log 'inserted'
		console.log '    ', err
		console.log '    ', data
		callback.apply this, arguments

module.exports = Server
