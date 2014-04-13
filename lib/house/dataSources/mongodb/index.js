//
// # MongoDb Data Source
//
// 

global.mongo = require('mongodb');

(exports = module.exports = function(options, house){
    var ds = {
        isConnected: false,
        options: options
    };
    var init = function() {
        var servers = [];
        var serverOpt = {
            "auto_reconnect": true
        }
        if(options.server) {
            var host = options.server;
            var port = options.port || 27017;
            servers = new mongo.Server(host, port, serverOpt);
        } else if(options.servers) {
            var optionServers = [];
            for(var i in options.servers) {
                var serv = options.servers[i];
                optionServers[i] = new mongo.Server(serv.host, serv.port, serverOpt);
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
        
        var dbOpts = {w: 1, journal: true};  // fsync: true
        var db_connector = new mongo.Db(options.db, servers, dbOpts);
        
        db_connector.on("close", function(error){
            console.log("DB connection closed.");
        });
        db_connector.open(function(err, db) {
          if(err) {
            house.log.err(err);
          } else {
            console.log('DB connected.');
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
           if(callback) {
               callback();
           } else {
               this.connectedCallbacks.forEach(function(e,i){
                   e();
               });
           }
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
        if(options.limit) {
            if(typeof options.limit == 'string') {
                options.limit = parseInt(options.limit, 10);
            }
        }
        if(options.sort) {
            if(typeof options.sort == 'string') {
                if(options.sort.substr(-1) == ('-')) {
                    var field = options.sort.substr(0, options.sort.length-1);
                    options.sort = {};
                    options.sort[field] = -1;
                } else {
                    var field = options.sort;
                    options.sort = {};
                    options.sort[field] = 1;
                }
            } else if(_.isArray(options.sort)) {
                var sortArray = _.clone(options.sort);
                options.sort = {};
                for(var i in sortArray) {
                    var field = sortArray[i];
                    if(field.substr(-1) == ('-')) {
                        field = field.substr(0, field.length-1);
                        options.sort[field] = -1;
                    } else {
                        options.sort[field] = 1;
                    }
                }
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
                //house.log.debug('find query '+query);
                //house.log.debug(query); 
                var options = parseQueryOptions(query);
                //house.log.debug(options); 
                
                var findCallback = function(err, cursor) {
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
                }
                
                if(options.hasOwnProperty('fields')) {
                    var fields = options.fields;
                    delete options.fields;
                    collection.find(query, fields, options, findCallback);
                } else {
                    collection.find(query, options, findCallback);
                }
                
            }
        });
    }
    ds.count = function(colName, query, callback) {
        this.db.collection(colName, function(err, collection) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(collection) {
                //house.log.debug('find query '+query);
                //house.log.debug(query); 
                var options = parseQueryOptions(query);
                //house.log.debug(options); 
                collection.find(query, options, function(err, cursor) {
                    if(err) {
                        house.log.err(err);
                        callback(err);
                    } else if(cursor) {
                        cursor.count(function(err, count) {
                            if(err) {
                                house.log.err(err);
                                callback(err);
                            } else {
                                callback(null, count);
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
                //console.log('mongo insert doc to col');
                collection.insert(newDoc, {safe:true}, function(err, docs) {
                    if(err) {
                        house.log.err(err);
                        callback(err);
                    } else if (docs) {
                        if(docs.length > 0) {
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
                        } else {
                            house.log.debug('empty insert?');
                        }
                        callback(err, docs);
                    }
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
    ds.update = function(colName, query, editDoc, options, callback) {
        if(typeof options == 'function') {
            callback = options;
            options = {safe:true};
        }
        //console.log('mongo update');
        this.db.collection(colName, function(err, collection) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(collection) {
                //console.log('mongo update doc to col');
                collection.update(query, editDoc, options, function(err, docs) {
                    callback(err, {});
                });
            }
        });
    }
    
    ds.info = function(query, callback) {
        //console.log('mongo ds info')
        if(query == '') {
            this.db.collectionNames(function(err, names) {
              if(err) {
                  house.log.err(err);
                  callback(err);
              } else if(names) {
                  var o = [];
                  //console.log(names)
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
                                    //console.log(count);
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
