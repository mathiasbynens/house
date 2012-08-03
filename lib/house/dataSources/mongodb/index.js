//
// # MongoDb Data Source
//
// 

global.mongo = require('mongodb');

(exports = module.exports = function(options, house){
    var ds = {
        isConnected: false
    };
    
    var init = function() {
        var servers = [];
        if(options.server) {
            var host = options.server;
            var port = options.port || 27017;
                
            servers = new mongo.Server(host, port);
        } else if(options.servers) {
            // TODO replica set
            var optionServers = [];
            for(var i in options.servers) {
                var serv = options.servers[i];
                optionServers[i] = new mongo.Server(serv.host, serv.port);
            }
            servers = new mongo.ReplSetServers(optionServers, {"rs_name": options.replicaSet});
        } else if(options.url) {
            var Db = require('mongodb').Db,
            connect = require('mongodb').connect;
            connect(options.url, function(err, db) {
                if(err) {
                  house.log.err(err);
                } else {
                  console.log('Connected to DB via URL.');
                  ds.db = db;
                  ds.connected();
                }
            });
            return;
        }
        
        var db = new mongo.Db(options.db, servers);
        
        db.open(function(err, db) {
          if(err) {
            house.log.err(err);
          } else {
            console.log('Connected to DB.');
            ds.db = db;
            
            ds.connected();
          }
        });
    }
    
    ds.connected = function(callback) {
       if(!this.hasOwnProperty('connectedCallbacks')) {
           this.connectedCallbacks = [];
       }
       if(callback) {
           this.connectedCallbacks.push(callback);
       } else {
           this.isConnected = true;
       }
       if(this.isConnected) {
           this.connectedCallbacks.forEach(function(e,i){
               e();
           });
       }
    }
    
    var parseQueryOptions = function(query) {
        var options = {};
        
        var optionNames = ['limit', 'skip', 'sort', 'fields', 'count']; // documents cannot have these as fields
        
        var applyOptionFromQuery = function(optionName) {
            if(query.hasOwnProperty(optionName)) {
                options[optionName] = query[optionName];
                delete query[optionName];
            }
        }
        for(var i in optionNames) {
            applyOptionFromQuery(optionNames[i]);
        }
        if(options.sort) {
            if(options.sort.substr(-1) == ('-')) {
                var field = options.sort.substr(0, options.sort.length-1);
                options.sort = {};
                options.sort[field] = -1;
            } else {
                var field = options.sort;
                options.sort = {};
                options.sort[field] = 1;
            }
        }
        
        return options;
    }
    
    ds.find = function(colName, query, callback) {
        this.db.collection(colName, function(err, collection) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(collection) {
                house.log.debug('find query '+query);
                house.log.debug(query); 
                var options = parseQueryOptions(query);
                house.log.debug(options); 
                collection.find(query, options, function(err, cursor) {
                    if(err) {
                        house.log.err(err);
                        callback(err);
                    } else if(cursor) {
                        cursor.toArray(function(err, results) {
                            if(err) {
                                house.log.err(err);
                                callback(err);
                            } else if(results) {
                                for(var i in results) {
                                    var ob = results[i];
                                    for(var oi in ob) {
                                        if(oi == '_id') {
                                            ob["id"] = ob[oi];
                                            delete ob[oi];
                                        }
                                    }
                                }
                                callback(null, results);
                            }
                        });
                    }
                });
            }
        });
    }
    ds.insert = function(colName, newDoc, callback) {
        this.db.collection(colName, function(err, collection) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(collection) {
                console.log('mongo insert doc to col');
                console.log(newDoc);
                collection.insert(newDoc, function(err, docs) {
                    console.log(docs);
                    
                    for(var i in docs) {
                        var doc = docs[i];
                        if(doc.hasOwnProperty('_id')) {
                            docs[i]["id"] = doc._id;
                            delete docs[i]["_id"];
                        }
                    }
                    
                    if(docs.length === 1) {
                       docs = _(docs).first();
                    }
                    
                    callback(err, docs);
                });
            }
        });
    }
    ds.remove = function(colName, query, callback) {
        this.db.collection(colName, function(err, collection) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(collection) {
                collection.remove(query, {"safe": true}, function(err, cursor) {
                    if(err) {
                        log.err(err);
                    } else {
                        callback(err, {});
                    }
                });
            }
        });
    }
    ds.update = function(colName, query, editDoc, callback) {
        console.log('mongo update');
        this.db.collection(colName, function(err, collection) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(collection) {
                console.log('mongo update doc to col');
                collection.update(query, editDoc, {safe:true}, function(err, docs) {
                    callback(err, {});
                });
            }
        });
    }
    
    ds.info = function(query, callback) {
        console.log('mongo ds info')
        if(query == '') {
            this.db.collectionNames(function(err, names) {
              if(err) {
                  house.log.err(err);
                  callback(err);
              } else if(names) {
                  var o = [];
                  console.log(names)
                  for(var i in names) {
                      var name = names[i]['name'];
                      
                      name = name.substr(name.indexOf('.')+1);
                      
                      var col = {
                          id: name,
                          name: name
                      }
                      o.push(col);
                  }
                  callback(null, o);
              }
            });
        } else {
            
            var dbCollectionName = query.substr(query.indexOf('/')+1);
            
            this.db.collection(dbCollectionName, function(err, collection) {
                if(err) {
                    house.log.err(err);
                    callback(err);
                } else {
                    var o = {
                        id: dbCollectionName
                    };
                    collection.indexInformation(function(err, indexes) {
                        if(err) {
                            house.log.err(err);
                            callback(err);
                        } else {
                            o.indexes = indexes;
                            collection.count(function(err, count) {
                                if(err) {
                                    house.log.err(err);
                                    callback(err);
                                } else {
                                    o.count = count;
                                    console.log(count);
                                    callback(err, o);
                                }
                            });
                        }
                    });
                }
            });
        }
    }
    
    init();
    
    return ds;
});