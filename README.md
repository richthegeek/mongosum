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

// Set the options on the summariser. Allows a specific "ignored_columns" on the collection
coll.setSummaryOptions(options, callback)

// Alter the default summary options - if the collection does not have explicit options, it will use these.
// This is not written to the database, it must be refreshed on each instance.
dbms._defaultSummaryOptions // the object that stores these defaults, can be read/written directly
dbms.defaultSummaryOptions(options)
db.defaultSummaryOptions(options) // writes to global default
coll.defaultSummaryOptions(options) // writes to global default
```

## Tracked information
At the collection level, the summary tracks:

 - _length: the total number of records that contributed to the summary.
 - _updated: the timestamp of the last insert/update/delete call.

On a column level, depending on type:

 - type: the constructor name of the last value. For example, "String" or "Number".
 - example: the last value set on this property. Not guaranteed to still exist in the database.
 - For numeric values:
 	- sum: the sum of values in this property.
 	- min: the minimum value in this property.
 	- max: the maximum value in this property.

## Options
Options can be set per-instance with coll.defaultSummaryOptions(options) or persisted with coll.setSummaryOptions(options).

The options should be an object with the following optional properties:

 - ignored_columns: an array of column names which mongosum should not summarise, such as _id.
 - ignored_collections: an array of collection names for which mongosum should not create summaries.
 - track_column(name, options): a (non-persisted) callback function that should return true if this column is to be tracked. The default implementation checks for the column in the ignored_columns option.
 - track_collection(name, options): a (non-persisted) callback function that should return true if this collection is to be tracked. The default implementation checks for the column in the ignored_collections option.
