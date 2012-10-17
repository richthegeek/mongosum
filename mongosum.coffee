Server = require 'mongolian'
DB = require 'mongolian/lib/db.js'
Collection = require 'mongolian/lib/collection.js'

collection_name = '_summaries'

Server.prototype.defaultSummaryOptions = (opts) ->
	@_defaultSummaryOptions = opts or @_defaultSummaryOptions or {
		ignored_columns: ['_id']
	}
	return @_defaultSummaryOptions

DB.prototype.defaultSummaryOptions = () ->
	@server.defaultSummaryOptions.apply this, arguments
Collection.prototype.defaultSummaryOptions = () ->
	@db.server.defaultSummaryOptions.apply this, arguments


Server.prototype.db = (name) ->
	if not @_dbs[name]?
		@_dbs[name] = new DB @, name
		@_dbs[name].summary = new Collection @_dbs[name], collection_name
	return @_dbs[name]

DB.prototype.collection = (name) ->
	return @_collections[name] or (@_collections[name] = new Collection @, name)


Collection.prototype.getSummaryOptions = (callback) ->
	if not @_summaryOptions
		@getSummary (err, summary) =>
			callback @_summaryOptions = summary._options
	else
		callback @_summaryOptions

Collection.prototype.setSummaryOptions = (options, callback) ->
	@getSummary (err, summary) =>
		summary._options = options
		@setSummary summary, callback

###
# Retrieve the summary for this collection
###
Collection.prototype.getSummary = (callback) ->
	if @name is collection_name
		throw 'MongoSum cannot get the summary of the summarys collection.'

	criteria = _id: @name
	@db.summary.find(criteria).next (err, summary = {}) =>
		summary._id ?= @name
		summary._options ?= @defaultSummaryOptions()
		@_summaryOptions = summary._options
		callback err, summary

###
# Set the summary for this collection (used internally)
###
Collection.prototype.setSummary = (summary, callback) ->
	if @name is collection_name
		throw 'MongoSum cannot set the summary of the summarys collection'

	criteria = _id: @name
	summary._id = @name
	@db.summary.update criteria, summary, true, callback

###
# Do a full-table update of the summary. This is expensive.
###
Collection.prototype.rebuildSummary = (callback) ->
	@getSummaryOptions () =>
		summary = {_options: @_summaryOptions}

		each = (object) -> merge_summary summary, get_summary object, @_summaryOptions
		@find().forEach each, () =>
			@setSummary summary, callback

###
# INTERNAL. Merge summary, save it, and fire the callback.
###
Collection.prototype._merge_summarys = (err, data, callback, options, summary, summary_change_count) ->
	if summary_change_count > 0
		@getSummary (err, full_summary) =>
			full_summary = merge_summary full_summary, summary, options
			@setSummary full_summary, () ->
				callback and callback err, data
	else
		callback and callback err, data

Collection.prototype._drop = Collection.prototype.drop
Collection.prototype.drop = () ->
	@db.summary.remove _id: @name
	@_drop.apply this, arguments

Collection.prototype._insert = Collection.prototype.insert
Collection.prototype.insert = (object, callback) ->
	if @name is collection_name
		return Collection.prototype._insert.apply this, arguments

	[summary, summary_change_count, options]  = [{}, 0, null]
	update_summary = (err, data) =>
		if not err
			summary_change_count++
			merge_summary summary, get_summary data, @_summaryOptions

	if Object::toString.call(object) isnt '[object Array]'
		object = [object]

	@getSummaryOptions () =>
		complete = 0
		for obj in object
			@_insert obj, (err, data) =>
				update_summary err, data
				if ++complete is object.length
					@_merge_summarys err, data, callback, {}, summary, summary_change_count

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
	[summary, summary_change_count]  = [{}, 0]
	subtract_summary = (err, data) =>
		if not err and data
			merge_summary summary, (get_summary data, @_summaryOptions), {
				sum: (a, b) -> return (b is null and -a) or (a - b)
				min: (a, b) -> a
				max: (a, b) -> a
			}

	update_summary = (err, data) =>
		if not err and data
			summary_change_count++
			merge_summary summary, get_summary data, @_summaryOptions

	if Object::toString.call(object) isnt '[object Array]'
		object = [object]

	if multi isnt true
		object = [object.shift()]

	options =
		remove: false
		new: true
		upsert: !! upsert

	merge_opts =
		min: (a, b) ->
			if isNaN(parseInt(a)) or (b == a)
				throw 'FULL UPDATE'
			return Math.min a, b
		max: (a, b) ->
			if isNaN(parseInt(a)) or (b == a)
				throw 'FULL UPDATE'
			return Math.max a, b


	@getSummaryOptions () =>
		@find(criteria).toArray (err, _originals = []) =>
			originals = {}
			originals[o._id.toString()] = o for o in _originals
			for_merge = []
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
					if not err and data
						subtract_summary err, originals[data._id.toString()]
						if not err
							for_merge.push data
						if ++complete is object.length
							try
								update_summary null, data for data in for_merge
								@_merge_summarys err, data, callback, merge_opts, summary, summary_change_count
							catch e
								if e is 'FULL UPDATE'
									@updateSummary callback
								else
									throw e

Collection.prototype._remove = Collection.prototype.remove
Collection.prototype.remove = (criteria, callback) ->
	if @name is collection_name
		return Collection.prototype._update.apply this, arguments

	if not callback and typeof criteria is 'function'
		callback = criteria
		criteria = {}

	summary = {}
	summary_options = null
	subtract_summary = (err, data) =>
	if not err and data
		merge_summary summary, (get_summary data, @_summaryOptions), {
			sum: (a, b) -> return (b is null and -a) or (a - b)
			min: (a, b) -> a
			max: (a, b) -> a
		}
	merge_opts =
		min: (a, b) ->
			if isNaN(parseInt(a)) or (b == a)
				throw 'FULL UPDATE'
			return Math.min a, b
		max: (a, b) ->
			if isNaN(parseInt(a)) or (b == a)
				throw 'FULL UPDATE'
			return Math.max a, b

	@getSummaryOptions () =>
		@find(criteria).toArray (err, data) =>
			data = data or []
			for row in data
				subtract_summary err, row
			try
				if data.length > 0
					@_merge_summarys err, data, (() -> null), merge_opts, summary, 1
				@_remove criteria, callback
			catch e
				if e is 'FULL UPDATE'
					@updateSummary callback
				else
					throw e


get_summary = (object, options) ->
	walk_objects object, {}, options, (key, vals, types) ->
		ret = {}
		ret.type = types[0]
		ret.example = vals[0]
		if types[0] is 'Number' or vals[0] = parseInt vals[0], 10
			ret.min = ret.max = ret.sum = vals[0]
		return ret

merge_summary = (left, right, options = {}) ->
	options.sum ?= (a, b) -> return (parseInt(a, 10) + parseInt(b, 10)) or a
	options.min ?= Math.min
	options.max ?= Math.max

	walk_objects left, right, {}, (key, vals, types) ->
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

walk_objects = (first, second = {}, options, fn) ->
	keys = (k for k,v of first)
	(keys.push k for k,v of second when k not in keys)

	ignore = options.ignored_columns or []
	for key in keys when key not in ignore
		v1 = first[key]
		v2 = second[key]
		type = (o) -> (o? and o.constructor and o.constructor.name) or 'Null'

		if type(v1) in ['Object', 'Array'] and not v1.type?
			first[key] = walk_objects v1, v2, options, fn
		else
			first[key] = fn key, [v1, v2], [type(v1), type(v2)]
	for key in (options.ignored_columns or []) when first and first[key]
		delete first[key]
	return first


module.exports = Server
