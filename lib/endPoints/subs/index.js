 //
// # Subs Collection API Endpoint
//
var child = require('child_process');
var spawn = child.spawn;

var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var filesRoot = options.collectionFilesRoot || 'files';
    var colFiles = options.collectionFiles || filesRoot+'.files';
    var usersCol = options.collectionUsers || 'users';
    var imagesCol = options.collectionImages || 'images';
    var urlsCol = options.collectionUrls || 'urls';
    var feedEndPoint = house.api.getEndPointByName("feed");
    var urlsEndPoint = house.api.getEndPointByName(urlsCol);
    var twitterEndpoint = house.api.getEndPointByName("twitter");
    
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
    var incUserSubs = function(userId, b) {
        incUserField(userId, 'subsCount', b);
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var getTwitterEndpoint = function(url, callback) {
            twitterEndpoint({
                session: req.session,
                method: 'GET',
                url: url,
                // fields: doc
            }, {
                end: function() {},
                data: function(data) {
                    if(callback) {
                        callback(null, data);
                    }
                },
                writeHead: function() {}
            });
        }
    
        var filterData = function(data) {
            return data;
        }
        var countQuery = function(query) {
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
            } else if(req.session.data.user) {
                query["owner.id"] = req.session.data.user;
            } else {
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
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                query["owner.id"] = req.session.data.user;
            } else if(req.session.data.user) {
                query["owner.id"] = req.session.data.user;
            } else {
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
        
        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {"col": "subs", "id": doc.id},
                "sub": doc,
                "at": doc.at
            }
            feedEndPoint({session: req.session, method: 'POST', url: '', fields: newFeedItem}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
                ds.update(col, {"_id": doc.id}, {"$set": {"feed": {id:newFeedData.id,at:newFeedData.at}}}, function(err, data) {
                    if(callback) {
                        callback(newFeedData);
                    }
                });
            },writeHead:function(){}});
        }
        var updateDocInFeed = function(doc) {
            var updateDoc = {
                "$set": {
                    "sub": doc,
                    "at": doc.at
                }
            }
            feedEndPoint({session: req.session, method: 'PUT', url: '/'+doc.feed.id, fields: updateDoc}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
            },writeHead:function(){}});
        }
        var removeDocFromFeed = function(doc) {
            if(doc.feed && doc.feed.id) {
                feedEndPoint({session: req.session, method: 'DELETE', url: '/'+doc.feed.id, fields: {delete: true}}, {end:function(){}, data:function(newFeedData){
                },writeHead:function(){}});
            } else if(doc.id) {
                var feedQuery = {"ref": {"col": "subs", "id": doc.id}};
                ds.find('feed', feedQuery, function(err, data) {
                    _.each(data, function(e) {
                        var docId = e.id;
                        house.io.rooms.in('feed').emit('deletedFeed', docId);
                    });
                    ds.remove('feed', feedQuery, function(err, data) {
                    });
                });
            }
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
            //house.log.debug('post sub');
            if(path == '') {
                var newDoc = req.fields;
                newDoc.at = new Date();
                newDoc.owner = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                if(!newDoc.hasOwnProperty('url')) {
                    res.writeHead(400);
                    res.data({message: "URL required!"});
                    return false;
                }
                // check this doesnt exist already
                var findQuery = {
                    url: newDoc.url,
                    "owner.id": newDoc.owner.id
                }
                ds.find(col, findQuery, function(err, data){
                    if (err) {
                        house.log.err(err);
                    } else {
                        if(data.length > 0) {
                            // house.log.debug('sub exists already');
                            res.data(filterData(data));
                            
                            // house.log.debug('proc for udpates...');
                            
                            var resWithDoc = _.first(data);
                            
                            if(!resWithDoc.hasOwnProperty('url')) {
                                res.writeHead(400);
                                res.data({message: "URL required!"});
                                throw new Error("Url required for subscription");
                                return false;
                            }
                            if(forkedFeedFetcher) {
                                // house.log.debug('use forked feed reader to re-post url for updates');
                                forkedFeedFetcher.send({"postSubUrl": resWithDoc});
                            }
                        } else {
                            var doInsert = function(newDoc) {
                                ds.insert(col, newDoc, function(err, data){
                                    //house.log.debug('inserted new sub')
                                    //house.log.debug(data)
                                    var respondWithFind = function(docId) {
                                        var query = {_id: docId};
                                        ds.find(col, query, function(err, docs) {
                                            if (err) {
                                                house.log.err(err);
                                            } else {
                                                if(docs.length > 0) {
                                                    var resWithDoc = _.first(docs);
                                                    
                                                    if(!resWithDoc.hasOwnProperty('url')) {
                                                        res.writeHead(400);
                                                        res.data({message: "URL required!"});
                                                        throw new Error("Url required for subscription");
                                                        return false;
                                                    }
                                                    if(forkedFeedFetcher) {
                                                        // house.log.debug('use forked feed reader to post url')
                                                        forkedFeedFetcher.send({"postSubUrl": resWithDoc});
                                                    } else {
                                                        var newUrl = {url: resWithDoc.url, groups: ['public']};
                                                        
                                                        if(resWithDoc.hasOwnProperty('twitterUser')) {
                                                            newUrl.channel = {
                                                                meta: resWithDoc.twitterUser,
                                                                type: "application/twitter"
                                                            }
                                                            if(resWithDoc.twitterUser.hasOwnProperty()) {
                                                                newUrl.channel.title = '@'+resWithDoc.twitterUser.screen_name+' • '+resWithDoc.twitterUser.name;
                                                            }
                                                        }
                                                        
                                                        //house.log.debug('lets post a url from this sub')
                                                        //house.log.debug(newUrl)
                                                        var nowBeforePost = new Date();
                                                        urlsEndPoint({session: req.session, method: 'POST', url: '', fields: newUrl}, {end:function(){}, data:function(newUrlData){
                                                            if(_.isArray(newUrlData)) {
                                                                newUrlData = _.first(newUrlData);
                                                            }
                                                            // console.log('newUrlData');
                                                            // console.log(newUrlData);
                                                            
                                                            if(newUrlData.hasOwnProperty('rssUrl')) {
                                                                // house.log.debug('this sub url has a <link type rss+xml> url');
                                                                var newRssUrl = {url: newUrlData.rssUrl, groups: ['public'], parentUrl: resWithDoc.url};
                                                                //house.log.debug('lets post a url from this sub')
                                                                //house.log.debug(newUrl)
                                                                urlsEndPoint({session: req.session, method: 'POST', url: '', fields: newRssUrl}, {end:function(){}, data:function(rssUrlData){
                                                                    if(_.isArray(rssUrlData)) {
                                                                        rssUrlData = _.first(rssUrlData);
                                                                    }
                                                                    ds.update(col, {"_id": docId}, {"$set": {"url": rssUrlData.url, "urlDoc": rssUrlData, "channelUrlDoc": newUrlData}}, function(err, data) {
                                                                    });
                                                                    resWithDoc.url = rssUrlData.url;
                                                                    resWithDoc.urlDoc = rssUrlData;
                                                                    resWithDoc.channelUrlDoc = newUrlData;
                                                                    // insert to feed
                                                                    insertDocToFeed(resWithDoc, function(feedDocs){
                                                                        // house.log.debug('subscription saved from html page');
                                                                    });
                                                                    resWithDoc = filterData(resWithDoc);
                                                                    emitToRoom(col, 'inserted', resWithDoc);
                                                                },writeHead:function(){}});
                                                            } else {
                                                                ds.update(col, {"_id": docId}, {"$set": {"urlDoc": newUrlData}}, function(err, data) {
                                                                });
                                                                resWithDoc.urlDoc = newUrlData;
                                                                // insert to feed
                                                                insertDocToFeed(resWithDoc, function(feedDocs){
                                                                    //house.log.debug('subscription inserted to feed');
                                                                });
                                                                resWithDoc = filterData(resWithDoc);
                                                                emitToRoom(col, 'inserted', resWithDoc);
                                                            }
                                                            //console.log(resWithDoc.at)
                                                            
                                                            //if(nowBeforePost > resWithDoc.at) {
                                                                //console.log('url existed before this sub, so lets grab old articles')
                                                            //}
                                                            
                                                        },writeHead:function(){}});
                                                    }
                                                    resWithDoc = filterData(resWithDoc);
                                                    res.data(resWithDoc);
                                                    emitToRoom(col, 'inserted', resWithDoc);
                                                } else {
                                                    //house.log.err('find of inserted subs returned no results');
                                                    var data = filterData(data);
                                                    res.data(data);
                                                    emitToRoom(col, 'inserted', data);
                                                }
                                            }
                                        });
                                    }
                                    if(err) {
                                        house.log.err(err);
                                    } else if(data) {
                                        incUserSubs(req.session.data.user, 1);
                                        respondWithFind(data.id);
                                    }
                                });
                            } // doInsert
                            var twitterUrlPrefix = 'https://twitter.com/';
                            if(newDoc.url && newDoc.url.indexOf(twitterUrlPrefix) === 0) {
                                var screenName = newDoc.url.substr(newDoc.url.indexOf(twitterUrlPrefix)+twitterUrlPrefix.length);
                                // console.log(screenName);
                                getTwitterEndpoint('/users/show.json?screen_name='+screenName, function(err, data){
                                    if(err) {
                                        house.log.err(err);
                                        doInsert(newDoc);
                                    } else {
                                        if(data) {
                                            newDoc.source = "twitter";
                                            newDoc.twitterUser = data;
                                        }
                                        doInsert(newDoc);
                                    }
                                });
                            } else {
                                doInsert(newDoc);
                            }
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
                        //house.log.debug(data);
                        
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            //house.log.debug(data);
                            if(updateGroups) {
                            }
                            if(putDoc.hasOwnProperty('$set') && putDoc['$set'].hasOwnProperty('url')) {
                                var postDoc = {url: putDoc['$set']['url']};
                                if(updatedDoc.hasOwnProperty('groups')) {
                                    postDoc.groups = updatedDoc.groups;
                                } else {
                                }
                                postDoc.groups = ['public'];
                                urlsEndPoint({session: req.session, method: 'POST', url: '', fields: postDoc}, {end:function(){}, data:function(newUrlData){
                                    if(_.isArray(newUrlData)) {
                                        newUrlData = _.first(newUrlData);
                                    }
                                    //console.log(newUrlData);
                                    ds.update(col, {"_id": updatedDoc.id}, {"$set": {"urlDoc": newUrlData}}, function(err, data) {
                                    });
                                    updatedDoc = filterData(updatedDoc);
                                    updatedDoc.urlDoc = newUrlData;
                                    //res.data(resWithDoc);
                                    emitToRoom(col, 'updated', updatedDoc);
                                },writeHead:function(){}});
                            }
                            var putRespond = function(data) {
                                if(insertToFeed) {
                                    insertDocToFeed(updatedDoc, function(feedDocs){
                                        var resWithDoc = updatedDoc;
                                        resWithDoc.feed = {id: feedDocs.id, at: feedDocs.at};
                                        res.data(resWithDoc);
                                        emitToRoom(col, 'updated', resWithDoc);
                                    });
                                } else if (updatedDoc.hasOwnProperty('feed')) {
                                    updateDocInFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoom(col, 'updated', updatedDoc);
                                } else if (removeFromFeed) {
                                    removeDocFromFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoom(col, 'updated', updatedDoc);
                                } else {
                                    data = filterData(data);
                                    res.data(data);
                                    emitToRoom(col, 'updated', data);
                                }
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
            var query = req.fields || {};
            // console.log(req.fields)
            if(docId) {
                query._id = docId;
            } else {
                if(_.size(query) === 0) {
                    res.writeHead(400);
                    res.end('{}');
                    return;
                }
            }
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['owner.id'] = req.session.data.user;
            }
            house.log.debug(query);
            ds.find(col, query, function(err, data) {
                var doc = _.first(data);
                incUserSubs(req.session.data.user, -1);
                removeDocFromFeed(doc);
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error removing sub');
                    } else {
                        
                        // also remove news from this subscription
                        ds.remove('news', {user_id: doc.owner.id, fromUrl: doc.url}, function(err, data){
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                res.data({});
                                emitToRoom(col, 'deleted', doc.id);
                            }
                        });
                    }
                });
            });
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    var moment = require("moment");
    var fetchFeeds = function() {
        var now = new Date();
        var ex = moment().subtract('hours', 3);
        var query = {
            "channel.last": {
                $lt: ex.toDate()
            }
        };
        ds.find(urlsCol, query, function(err, data) {
            if(err) {
                house.log.err(err);
            } else {
                //house.log.debug('update urls '+data.length);
                if(data.length > 0) {
                    _.each(data, function(doc) {
                        //console.log(doc);
                        var updateDoc = {
                            $set: {proc: 0}
                        }
                        var sess = {
                            data: {
                                user: doc.owner.id
                            }
                        }
                        urlsEndPoint({session: sess, method: 'PUT', url: '/'+doc.id, fields: updateDoc}, {end:function(){}, data:function(newFeedData){
                            //house.log.debug('subs url feed updated');
                        },writeHead:function(){}});
                    });
                }
            }
        });
    }
    
    var emitToRoom = function(col, verb, doc) {
        if(!house.io || !house.io.rooms) {
            // house.log.debug('no io to emit subs');
            return;
        } else {
            house.io.emitToRoomDocOwnerId(col, verb, doc);
        }
    }
    var emitToFunc = function(func, col, verb, doc) {
        if(!house.io || !house.io.rooms) {
            // house.log.debug('no io to emit subs');
            return;
        } else {
            if(house.io.hasOwnProperty(func)) {
                house.io[func](col, verb, doc);
            }
        }
    }
    
    var forkedFeedFetcher;
    var forkFeedFetcher = function() {
        if(!house.config.subsFetcher) {
            return;
        }
        var rate = 0;
        if(house.config.subsFetcher.rate) {
            //|| 1000*60*60;
            rate = house.config.subsFetcher.rate;
        }
        if(house.config.forkedFeedFetcher) {
            house.log.debug('forked house subs feed fetcher');
            return;
        }
        forkedFeedFetcher = child.fork(__dirname+"/fetch.js");
        var forkConfig = _.clone(house.config);
        forkConfig.forkedFeedFetcher = true;
        
        forkedFeedFetcher.send({"config": {config: forkConfig}});
        
        forkedFeedFetcher.on('message', function(m) {
        //   console.log('got message from fork:', m);
          if(m.hasOwnProperty('updatedSubDoc')) {
            var doc = m.updatedSubDoc;
            emitToRoom(col, 'inserted', doc);
            var newFeedItem = {
                "ref": {"col": "subs", "id": doc.id},
                "sub": doc,
                "at": doc.at
            }
            var sess = {
                data: {
                    user: doc.owner.id,
                    name: doc.owner.name
                }
            }
            feedEndPoint({session: sess, method: 'POST', url: '', fields: newFeedItem}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
                ds.update(col, {"_id": doc.id}, {"$set": {"feed": {id:newFeedData.id,at:newFeedData.at}}}, function(err, data) {
                });
            },writeHead:function(){}});
          } else if(m.hasOwnProperty('emit')) {
            var doc = m.emit;
            emitToFunc(doc.func, doc.col, doc.verb, doc.doc);
          }
        });
        
        if(rate) {
            setInterval(function(){
                forkedFeedFetcher.send({"fetchFeeds": true}); 
            }, rate);
        }
        
        /*setTimeout(function(){
            forkedFeedFetcher.send({"fetchFeeds": true});
        }, 3000);*/
    }();
    
    return handleReq;
});
