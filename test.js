// Generated by CoffeeScript 1.3.3
(function() {
  var coll, db, dbms, mongo;

  mongo = require('./mongosum.js');

  dbms = new mongo;

  db = dbms.db('mongosum_test');

  coll = db.collection('test');

  coll.insert([
    {
      a: 'alice',
      b: 42
    }, {
      a: 'bob',
      b: 12
    }
  ]);

}).call(this);
