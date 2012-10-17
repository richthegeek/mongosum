# Mongolian Summary
## Automatically maintain summary tables on Mongo collections
Mongolian Summary extends the Mongolian Deadbeef package such that any insert/update/remove call maintains a summary of the information in the table.
This allows much easier min/max/sum operations on the collection as it is calculated during insertion.

## Default Usage
```
mongo = require 'mongosum'
dbms = new mongo
db = dbms.db 'mydb'
coll = db.collection 'users'

coll.insert {name: 'Richard', age: 23}
```

## New commands
```javascript
// Get the summary of a collection
coll.getSummary(callback)


// Force a full refresh of the summary (this is a heavy operation, do it rarely)
coll.rebuildSummary(callback)

// Set the options on the summariser. Currently only suppors an "ignored_columns" array, for things like _id
coll.setSummaryOptions(options, callback)

// Alter the default summary options - if the collection does not have explicit options, it will use these.
// This is not written to the database, it must be refreshed on each instance.
dbms.defaultSummaryOptions(options)
db.defaultSummaryOptions(options) // writes to global default
coll.defaultSummaryOptions(options) // writes to global default
```