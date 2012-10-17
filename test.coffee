mongo = require './mongosum.js'

dbms = new mongo

db = dbms.db 'mongosum_test'
coll = db.collection 'test'

coll.insert a: 'alice', b: 42
