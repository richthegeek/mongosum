mongo = require './mongosum.js'

dbms = new mongo

db = dbms.db 'mongosum_test'
coll = db.collection 'test'

# coll.insert [{a: 'bob', b: 12}, {a: 'alice', b: 42}]
coll.insert {a: 'george', b: 0}

# coll.update {a: 'george'}, {a: 'george', b: 50}
