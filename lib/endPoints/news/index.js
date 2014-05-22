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
    var subsCol = options.collectionSubs || 'subs';
    var newsCol = options.collectionNews || 'news';
    var feedEndPoint = house.api.getEndPointByName("feed");
    
    var ensureIndexes = function() {
        var collection = ds.db.collection(col);
        collection.ensureIndex({"date": -1, "read": 1, "user_id": 1}, function(){ // , "fromUrl": 1
            house.log.debug('indexes ensured for '+col);
        });
    };
    
    if(!house.config.forkedFeedFetcher) {
        ds.connected(function(){
            ensureIndexes();
        });
    }
    
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
    
    var recalcUpdateSubUnread = function(user_id, fromUrl) {
        // house.log.debug('news endpoint - recalcUpdateSubUnread');
        var query = {
            "user_id": user_id,
            "fromUrl": fromUrl,
            "read": {"$exists": false}
        }
        ds.count(newsCol, query, function(err, data){
            if(err) {
                house.log.err(err);
            } else {
                setUserSubUnreadCount(user_id, fromUrl, data);
            }
        });
    }
    var setUserSubUnreadCount = function(userId, fromUrl, unreadCount) {
        // house.log.debug('news endpoint - setUserSubUnreadCount unread: '+unreadCount);
        var updateQuery = {"owner.id": userId, "url": fromUrl};
        var doc = {
            "$set": {
                "unreadCount": unreadCount
            }
        }
        ds.update(subsCol, updateQuery, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                ds.find(subsCol, updateQuery, function(err, data) {
                    if(err) {
                        house.log.err(err);
                    } else if(data.length) {
                        doc = data;
                        if(_.isArray(data)) {
                            doc = _.first(data);
                        }
                        console.log('emitToSubs subsCol')
                        // console.log(doc)
                        emitToSubs('updated', doc);
                    }
                });
            }
        });
    }
    var incUserSubUnread = function(userId, fromUrl, fromUrlB, b) {
        if(typeof fromUrlB !== 'string') {
            b = fromUrlB;
            fromUrlB = false;
        }
        // house.log.debug('news endpoint - incUserSubUnread: '+b);
        var doc = {
            "$inc": {
                "unreadCount": b
            }
        }
        var updateQuery = {"owner.id": userId, "url": fromUrl};
        
        if(fromUrlB) {
            updateQuery = {
                "$or": [
                    {"owner.id": userId, "url": fromUrl},
                    {"owner.id": userId, "url": fromUrlB}
                ]
            }
        }
        
        ds.update(subsCol, updateQuery, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                //if(cb) cb();
                //console.log('ds.update unreadCount')
                //console.log(data);
                
                ds.find(subsCol, updateQuery, function(err, data) {
                    if(err) {
                        house.log.err(err);
                    } else if(data.length) {
                        doc = data;
                        if(_.isArray(data)) {
                            doc = _.first(data);
                        }
                        emitToSubs('updated', doc);
                    }
                });
            }
        });
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
            if(query.hasOwnProperty('fav')) {
                query["fav"] = (query["fav"] === 'true') ? true : false;
                delete query["read"]; // dont care when looking for fav's
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
            
            // Black magic to get the URL with query string as a query string parameter
            //  ie. /api/news?fromUrl=http%3A%2F%2Fwww.globaltimes.cn%2FDesktopModules%2FDnnForge+-+NewsArticles%2FRss.aspx%3FTabID%3D99%26ModuleID%3D405%26CategoryID%3D44%2C45%2C46%2C47%2C48%2C106%2C138%26MaxCount%3D100%26sortBy%3DStartDate%26sortDirection%3DDESC&skip=0&limit=24&sort=date-&user_id=50ecb7ed970b6cd45700001f
            if(query.hasOwnProperty('fromUrl') && req.method == 'GET' && req.hasOwnProperty('urlParsed')) {
                var fromStr = 'fromUrl=';
                var i = req.urlParsed.href.indexOf(fromStr);
                query.fromUrl = req.urlParsed.href.substr(i + fromStr.length);
                // console.log(req.url)
                // console.log(url.parse(encodeURI(req.url), true));
                var parsedFromUrl = url.parse(encodeURI(req.url), true);
                query = parsedFromUrl.query;
                query.fromUrl = decodeURIComponent(query.fromUrl);
                // console.log(query)
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
            
            if(query.hasOwnProperty('fav')) {
                query["fav"] = (query["fav"] === 'true') ? true : false;
                delete query["read"]; // dont care when looking for fav's
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
                // house.log.debug('news endpoint - insert new news story');
                ds.insert(col, newDoc, function(err, data){
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
                        // house.log.debug('news endpoint - inserted new news story');
                        var doc = data;
                        if(_.isArray(data)) {
                            doc = _.first(data);
                        }
                        incUserNews(req.session.data.user, 1);
                        if(doc && doc.user_id && doc.fromUrl) {
                            if(doc.fromUrlParent) {
                                incUserSubUnread(doc.user_id, doc.fromUrl, doc.fromUrlParent, 1);
                            } else {
                                incUserSubUnread(doc.user_id, doc.fromUrl, 1);
                            }
                        }
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
                var markRead = null;
                if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('read')) {
                    if(!putDoc["$set"]["read"]) {
                        delete putDoc["$set"]["read"];
                        if(!putDoc.hasOwnProperty('$unset')) {
                            putDoc["$unset"] = {};
                        }
                        putDoc["$unset"]["read"] = true;
                        markRead = false;
                    } else {
                        markRead = true;
                    }
                } else if(putDoc.hasOwnProperty('$unset') && putDoc["$unset"].hasOwnProperty('read')) {
                    markRead = false;
                }
                ds.update(col, query, putDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        //house.log.debug(data);
                        
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            // house.log.debug(data);
                            if(updatedDoc) {
                                if(markRead === false) {
                                    //incUserSubUnread(updatedDoc.user_id, updatedDoc.fromUrl, 1);
                                    recalcUpdateSubUnread(updatedDoc.user_id, updatedDoc.fromUrl);
                                } else if(markRead === true) {
                                    incUserSubUnread(updatedDoc.user_id, updatedDoc.fromUrl, -1);
                                }
                            }
                            
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
    var emitToSubs = function(verb, doc) {
        var col = subsCol;
        if(!house.io || !house.io.rooms) {
            // house.log.debug('no io to emit subs');
            
            // try to send it back up
            process.send({ "emit": {
                "func": "emitToRoomDocOwnerId",
                "col": col,
                "verb": verb,
                "doc": doc
            }});
            
            return;
        } else {
            house.io.emitToRoomDocOwnerId(col, verb, doc);
        }
    }
    var emitToRoom = function(col, verb, doc) {
        if(!house.io || !house.io.rooms) {
            // house.log.debug('no io to emit news');
            
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
