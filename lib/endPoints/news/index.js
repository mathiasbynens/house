//
// # News Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var filesRoot = options.collectionFilesRoot || 'files';
    var colFiles = options.collectionFiles || 'files.files';
    var usersCol = options.collectionUsers || 'users';
    var imagesCol = options.collectionImages || 'images';
    var urlsCol = options.collectionUrls || 'urls';
    var feedEndPoint = house.api.getEndPointByName("feed");
    
    var updateUserIdWithDoc = function(userId, doc, cb) {
        ds.update(usersCol, {_id: userId}, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incUserField = function(userId, field, b) {
        b = b || 1;
        var updateDoc = {"$inc":{}};
        updateDoc["$inc"][field] = b;
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserNews = function(userId, b) {
        incUserField(userId, 'newsCount', b);
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
         
        var filterData = function(data) {
            return data;
        }
        var countQuery = function(query) {
            if(query.hasOwnProperty('user_id')) {
                query["user_id"] = new ObjectID(query["user_id"]);
            } else if(req.session.data.user) {
                query["user_id"] = req.session.data.user;
            }
            if(!query.hasOwnProperty('read')) {
                query["read"] = {$exists: false};
            } else {
                if(query["read"] == 'true') {
                    query["read"] = true;
                }
            }
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
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
            
            if(query.hasOwnProperty('user_id')) {
                query["user_id"] = new ObjectID(query["user_id"]);
            } else if(req.session.data.user) {
                query["user_id"] = req.session.data.user;
            }
            
            if(!query.hasOwnProperty('read')) {
                query["read"] = {$exists: false};
            } else {
                if(query["read"] == 'true') {
                    query["read"] = true;
                }
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
            //house.log.debug('post news story');
            if(path == '') {
                var newDoc = req.fields;
                ds.insert(col, newDoc, function(err, data){
                    //house.log.debug('inserted new news story')
                    //house.log.debug(data)
                    var respondWithFind = function(docId) {
                        var query = {_id: docId};
                        //console.log('respondWithFind')
                        //console.log(query)
                        ds.find(col, query, function(err, docs) {
                            if (err) {
                                house.log.err(err);
                            } else {
                                if(docs.length > 0) {
                                    var resWithDoc = _.first(docs);
                                    resWithDoc = filterData(resWithDoc);
                                    res.data(resWithDoc);
                                    emitToRoom(col, 'inserted', resWithDoc);
                                } else {
                                    res.data(data);
                                }
                            }
                        });
                    }
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        incUserNews(req.session.data.user, 1);
                        respondWithFind(data.id);
                    }
                });
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
                query['user_id'] = req.session.data.user;
            }
            
            if(docId) {
                query._id = docId;
                var putDoc = req.fields;
                var updateGroups = false;
                var insertToFeed = false;
                var removeFromFeed = false;
                for(var k in putDoc) {
                    if(putDoc.hasOwnProperty(k) && k.substr(0,1) == '$') {
                        for(var colName in putDoc[k]) {
                            if(colName == 'groups') {
                                updateGroups = true;
                            }
                            if(colName == 'owner') {
                                
                            }
                            if(k == "$set" && colName == 'feed') {
                                insertToFeed = true;
                            } else if(k == "$unset" && colName == 'feed') {
                                removeFromFeed = true;
                            }
                        }
                    }
                }
                var doProc = false;
                if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('proc')) {
                    doProc = true;
                }
                if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('read')) {
                    if(!putDoc["$set"]["read"]) {
                        delete putDoc["$set"]["read"];
                        if(!putDoc.hasOwnProperty('$unset')) {
                            putDoc["$unset"] = {};
                        }
                        putDoc["$unset"]["read"] = true;
                    }
                }
                ds.update(col, query, putDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        //house.log.debug(data);
                        
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            //house.log.debug(data);
                            if(updateGroups) {
                            }
                            data = filterData(data);
                            res.data(data);
                            emitToRoom(col, 'updated', data);
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
                query['user_id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    incUserNews(req.session.data.user, -1);
                    ds.remove(col, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                            emitToRoom(col, 'deleted', docId);
                        }
                    });
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    var emitToRoom = function(col, verb, doc) {
        if(!house.io || !house.io.rooms) {
            house.log.debug('no io to emit news');
            
            // try to send it back up
            process.send({ "emit": {
                "func": "emitToRoomDocUserId",
                "col": col,
                "verb": verb,
                "doc": doc
            }});
            
            return;
        } else {
            house.io.emitToRoomDocUserId(col, verb, doc);
        }
    }
    
    return handleReq;
});
