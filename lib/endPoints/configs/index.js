//
// # Contacts Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection || 'configs';
    
    // var ensureIndexes = function() {
    //     var collection = ds.db.collection(col);
    //     collection.ensureIndex({"status": 1, "at": -1, "user.id": 1}, function(){
    //         house.log.debug('index ensured for orders status at user.id');
    //     });
    // };
    // ds.connected(function(){
    //     ensureIndexes();
    // });
    var parseDbConfigDocIntoHouse = function(doc) {
        house.log.debug('parse config key '+doc.key);
        if(doc.client) {
            
        } else {
            // console.log(house.config)
            house.config[doc.key] = doc.value;
        }
    }
    ds.connected(function(){
        ds.find(col, {}, function(err, data){
            if(err) {
                house.log.err(err);
            } else if(data) {
                // res.data(data);
                _.each(data, function(doc){
                    parseDbConfigDocIntoHouse(doc);
                });
            } else {
                house.log.err(new Error('no data from mongo'));
            }
        });
    });
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        if(!req.session.data.groups || req.session.data.groups.indexOf('admin') === -1) {
            res.data({});
        }
        
        var countQuery = function(query) {
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            //} else if(req.session.data.user) {
            } else {
                query["owner.id"] = req.session.data.user;
            }
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                    res.setHeader('X-Count', 0);
                    res.data({});
                } else {
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
        }
        var filterData = function(data) {
            return data;
        }
        var findQuery = function(query) {
            if(query.id) {
                query._id = query.id;
                delete query.id;
            }
            if(query.hasOwnProperty('_id') && typeof query._id == 'string') {
                try {
                    query._id = new ObjectID(query._id);
                } catch(e) {
                    console.log('bad object id');
                }
            }
            
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                if(!query.hasOwnProperty('owner.id') && !query.hasOwnProperty('owner')) {
                    query["owner.id"] = req.session.data.user;
                }
            //} else if(req.session.data.user) {
            } else {
                query["owner.id"] = req.session.data.user;
            }
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    data = filterData(data);
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var docId;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            docId = new ObjectID(docId);
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(docId) {
                query._id = docId;
                findQuery(query);
            } else {
                if(req.query) {
                    query = req.query;
                    
                    // query mongo id's
                    if(query.hasOwnProperty('id')) {
                        query._id = new ObjectID(query.id);
                        delete query.id;
                    }
                }
                findQuery(query);
            }
        } else if(req.method == 'HEAD') {
            var query = {};
            
            if(docId) {
                query._id = docId;
                findQuery(query);
            } else {
                if(req.query) {
                    query = req.query;
                }
                countQuery(query);
            }
        } else if(req.method == 'POST') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            house.log.debug('POST | '+col);
            
           if(path === '') {
            var newDoc = req.fields;
            newDoc.at = new Date();
            newDoc.owner = {
                id: req.session.data.user,
                name: req.session.data.name
            }
            
            var respondWithFindFromId = function(docId) {
                var query = {_id: docId};
                ds.find(col, query, function(err, docs) {
                    if (err) {
                        house.log.err(err);
                    } else {
                        var resWithDoc = _.first(docs);
                        resWithDoc = filterData(resWithDoc);
                        res.data(resWithDoc);
                        parseDbConfigDocIntoHouse(resWithDoc);
                    }
                });
            }
            var insertNewDocAndRespond = function() {
                ds.insert(col, newDoc, function(err, data){
                    house.log.debug('inserted new '+col);
                    house.log.debug(data);
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        respondWithFindFromId(data.id);
                    }
                });
            }
            
            insertNewDocAndRespond();
            }
        } else if(req.method == 'PUT') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['owner.id'] = req.session.data.user;
            }
            
            if(docId) {
                query._id = docId;
                var putDoc = req.fields;
                var updateGroups = false;
                for(var k in putDoc) {
                    if(putDoc.hasOwnProperty(k) && k.substr(0,1) == '$') {
                        for(var colName in putDoc[k]) {
                            if(colName == 'groups') {
                                updateGroups = true;
                            }
                            if(colName == 'user') {
                                
                            }
                            if(k == "$set" && colName == 'feed') {
                            } else if(k == "$unset" && colName == 'feed') {
                            }
                        }
                    }
                }
                var doProc = false;
                if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('proc')) {
                    doProc = true;
                }
                ds.update(col, query, putDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            house.log.debug(data);
                            var putRespond = function(data) {
                                data = filterData(data);
                                res.data(updatedDoc);
                                parseDbConfigDocIntoHouse(updatedDoc);
                            }
                            if(doProc) {
                                //processUrls(data, function(err, data){
                                    putRespond(data);
                                //});
                            } else {
                                putRespond(data);
                            }
                        });
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['owner.id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    // incUserTags(req.session.data.user, -1);
                    // removeDocFromFeed(doc);
                    ds.remove(col, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                        }
                    });
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    return handleReq;
});
