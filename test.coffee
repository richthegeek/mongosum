mongo = require './mongosum.js'

dbms = new mongo

dbms._defaultSummaryOptions.ignored_collections = ['foo']

db = dbms.db 'mongosum_test'
coll = db.collection 'test'

# coll.insert [{a: 'bob', b: 12}, {a: 'alice', b: 42}]
coll.insert {a: 'george', b: 10}
# coll.insert {a: 'bob', b: 15}

# coll.rebuildSummary()
