//
// # MongoDb Data Source
//
// 

var mongo = require('mongodb');

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
                collection.find(query, parseQueryOptions(query), function(err, cursor) {
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