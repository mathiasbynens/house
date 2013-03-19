 //
// # Articles Collection API Endpoint
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
    var subsCol = options.collectionUrls || 'subs';
    var feedEndPoint = house.api.getEndPointByName("feed");
    var newsEndPoint = house.api.getEndPointByName("news");
    
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
    var incUserArticles = function(userId, b) {
        incUserField(userId, 'articlesCount', b);
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var newsArticleToUserId = function(article, user_id) {
            console.log('new article for user')
            if(!article) {
                house.log.err('article required');
                return;
            }
            //console.log(article);
            var newNews = _.clone(article);
            newNews.article_id = newNews.id;
            newNews.user_id = user_id;
            delete newNews.id;
            delete newNews.at;
            
            newsEndPoint({session: req.session, method: 'POST', url: '', fields: newNews}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
                house.log.debug('posted news for user id');
            },writeHead:function(){}});
        }
        var newsArticleToSubscribers = function(article) {
            console.log('new article for subscribers')
            if(!article) {
                house.log.err('article required');
                return;
            }
            //console.log(article);
            var subsQuery = {
                url: article.fromUrl
            }
            ds.find(subsCol, subsQuery, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    house.log.debug('push news article to subscribers: '+data.length);
                    if(data) {
                        _.each(data, function(doc, i){
                            var ownerId = doc.owner.id;
                            var newNews = _.clone(article);
                            newNews.article_id = newNews.id;
                            newNews.user_id = ownerId;
                            delete newNews.id;
                            delete newNews.at;
                            
                            newsEndPoint({session: req.session, method: 'POST', url: '', fields: newNews}, {end:function(){}, data:function(newFeedData){
                                if(_.isArray(newFeedData)) {
                                    newFeedData = _.first(newFeedData);
                                }
                            },writeHead:function(){}});
                        });
                    }
                }
            });
        }
        
        var emitToRoomIn = function(col, verb, doc) {
            var colVerb = verb+col.charAt(0).toUpperCase() + col.substr(1);
            if(_.isArray(doc)) {
                _.each(doc, function(doc) {
                    emitToRoomIn(col, verb, doc);
                });
                return;
            }
            if(verb == 'deleted') {
                house.io.rooms.in(col).emit(colVerb, doc);
                return;
            }
            var groups = doc.groups || [];
            if(groups.indexOf('public') !== -1) {
                house.io.rooms.in(col).emit(colVerb, doc);
            } else {
                var ioRoomManager = house.io.rooms.in(col).manager;
                for(var id in ioRoomManager.handshaken) {
                    var handshake = ioRoomManager.handshaken[id];
                    var idSocket = house.io.rooms.socket(id);
                    if(handshake.session.groups && handshake.session.groups.length > 0) {
                        if(handshake.session.groups.indexOf('admin') !== -1) {
                            idSocket.in(col).emit(colVerb, doc);
                        } else {
                           for(var g in groups) {
                               if(handshake.session.groups.indexOf(groups[g]) !== -1) {
                                   idSocket.in(col).emit(colVerb, doc);
                                   break;
                               }
                           }
                        }
                    }
                }
            }
        }
        
        var countQuery = function(query) {
            if(!query.hasOwnProperty('$or')) {
                query["$or"] = [];
            }
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            } else if(req.session.data.user) {
                query["$or"].push({"owner.id": req.session.data.user});
                if(req.session.data.groups) {
                    query["$or"].push({"groups": {$in: req.session.data.groups}});
                }
            } else {
                //query["groups"] = 'public';
                query["$or"].push({"groups": 'public'});
            }
            if(query["$or"].length == 0) {
                delete query["$or"];
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
        var filterData = function(data) {
            /*if(!_.isArray(data)) {
                if(data.hasOwnProperty('updates')) {
                    _.each(data.updates, function(doc,ii){
                        delete data.updates[ii].src;
                    });
                }
            } else {
                _.each(data, function(doc, i){
                    if(doc.hasOwnProperty('updates')) {
                        _.each(doc.updates, function(doc,ii){
                            delete data[i].updates[ii].src;
                        });
                    }
                });
            }*/
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
            house.log.debug('post article');
            if(path == '') {
                var newDoc = req.fields;
                newDoc.at = new Date();
                
                // check article doesnt already exists
                var queryArticle = {
                }
                if(newDoc.hasOwnProperty('fromUrl')) {
                    queryArticle.fromUrl = newDoc.fromUrl;
                }
                if(newDoc.hasOwnProperty('guid')) {
                    queryArticle.guid = newDoc.guid;
                } else if(newDoc.hasOwnProperty('link')) {
                    queryArticle.link = newDoc.link;
                } else if(newDoc.hasOwnProperty('origlink')) {
                    queryArticle.origlink = newDoc.origlink;
                }
                var copyOld = false;
                if(newDoc.hasOwnProperty('copyOld')) {
                    delete newDoc.copyOld;
                    copyOld = true;
                }
                
                ds.find(col, queryArticle, function(err, data){
                    if (err) {
                        house.log.err(err);
                    } else {
                        if(data.length>0) {
                            house.log.debug('already have this article');
                            var resWithDoc = _.first(data);
                            
                            if(copyOld) {
                                newsArticleToUserId(resWithDoc, req.session.data.user);
                            }
                            
                            resWithDoc = filterData(resWithDoc);
                            res.data(resWithDoc);
                        } else {
                            ds.insert(col, newDoc, function(err, data){
                                house.log.debug('inserted new article')
                                //house.log.debug(data)
                                var respondWithFind = function(docId) {
                                    var query = {_id: docId};
                                    ds.find(col, query, function(err, docs) {
                                        if (err) {
                                            house.log.err(err);
                                        } else {
                                            if(docs.length > 0) {
                                                var resWithDoc = _.first(docs);
                                                
                                                newsArticleToSubscribers(resWithDoc);
                                                
                                                resWithDoc = filterData(resWithDoc);
                                                res.data(resWithDoc);
                                                emitToRoomIn(col, 'inserted', resWithDoc);
                                            } else {
                                                res.data(data);
                                                emitToRoomIn(col, 'inserted', data);
                                            }
                                        }
                                    });
                                }
                                if(err) {
                                    house.log.err(err);
                                } else if(data) {
                                    incUserArticles(req.session.data.user, 1);
                                    respondWithFind(data.id);
                                }
                            });
                        }
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
                query['owner.id'] = req.session.data.user;
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
                ds.update(col, query, putDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            house.log.debug(data);
                            var postDoc = {url: putDoc['$set']['url']};
                            if(updatedDoc.hasOwnProperty('groups')) {
                                postDoc.groups = updatedDoc.groups;
                            }
                            if(updateGroups) {
                            }
                            var putRespond = function(data) {
                                data = filterData(data);
                                res.data(data);
                                emitToRoomIn(col, 'updated', data);
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
                    incUserArticles(req.session.data.user, -1);
                    removeDocFromFeed(doc);
                    ds.remove(col, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                            emitToRoomIn(col, 'deleted', docId);
                        }
                    });
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    return handleReq;
});
