// Generated by CoffeeScript 1.3.3
(function() {
  var coll, db, dbms, mongo;

  mongo = require('./mongosum.js');

  dbms = new mongo;

  dbms._defaultSummaryOptions.ignored_collections = ['foo'];

  db = dbms.db('mongosum_test');

  coll = db.collection('test');

  coll.insert({
    a: 'bob',
    b: 12
  }, function() {
    return coll.insert({
      a: 'alice',
      b: 42
    });
  });

}).call(this);
