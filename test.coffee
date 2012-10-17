mongo = require './mongosum.coffee'

dbms = new mongo

db = dbms.db 'mongosum_test'
coll = db.collection db

coll.insert a: 'alice', b: 42
