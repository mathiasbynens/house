//
// # Posts Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
var mkdirp = require('mkdirp');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var colFiles = options.collectionFiles || 'files.files';
    var filesRoot = 'files';
    var usersCol = 'users';
    var imagesCol = 'images';
    var feedEndPoint = house.api.getEndPointByName("feed");
    
    var warmUpCache = true;
    
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
    var incUserPosts = function(userId, b) {
        incUserField(userId, 'postsCount', b);
    }
    
    var cacheDir = process.cwd() + "/cache" + "/posts/";
    mkdirp(cacheDir+'id', function (err) {
        if (err) {
            house.log.err('mkdirp cache posts error');
            house.log.err(err);
        } else {
            house.log.debug('mkdirp cache posts');
        }
    });
    
    if(warmUpCache) {
        setTimeout(function(){
            house.log.debug('warming up posts cache');
            var toCache = [];
            ds.find(col, {groups:['public']}, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    //house.log.debug(data.length+' posts to cache');
                    
                    _.each(data, function(doc){
                        //console.log(doc);
                        var postPath = 'id/'+doc.id;
                        //console.log(postPath)
                        if(doc.slug) {
                            postPath = doc.slug;
                        }
                        toCache.push(postPath);
                    });
                    
                    var cacheOne = function(){
                        cachePostHtml(toCache.pop(), function(){
                            //house.log.debug('cached post, next..');
                            if(toCache.length > 0) {
                                cacheOne();
                            } else {
                                house.log.debug('done warming up posts cache');
                            }
                        });
                    }
                    cacheOne();
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        },10000);
    }
    
    var cachePostHtml = function(postsPath, callback) {
        var publishPath = cacheDir+postsPath+'.html';
        var phantomUrl = function(url, callback) {
            console.log('pantom url '+url)
            var html = ''
            , title = ''
            , desc = '';
            var screenRes = '1024x768x24'; // 640x480x24
            //var phantomjs = spawn('xvfb-run', ['-as', '-screen 0 '+screenRes, 'phantomjs', __dirname+'/phantom.js', url]);
            var phantomjs = spawn('phantomjs', [__dirname+'/phantom.js', url]);
            phantomjs.stdout.on('data', function (data) {
              //console.log('phantomjs.stdout: ' + data);
              html += data.toString();
            });
              
            phantomjs.stderr.on('data', function (data) {
              console.log('!phantomjs stderr: ' + data);
            });
              
            phantomjs.on('exit', function (code) {
              console.log('phantomjs process exited with code ' + code);
                callback(null, html, title);
            });
        }
        house.log.debug('phantomUrl');
        house.log.debug(house.config.site.url+"posts/"+postsPath);
        fs.unlink(publishPath, function(err){
            phantomUrl(house.config.site.url+"posts/"+postsPath, function(err, html, title) {
                //console.log(html);
                // to root web for now
                console.log(publishPath);
                //return; // TODO
                fs.writeFile(publishPath, html, function(err){
                    if(err) {
                        house.log.err(err);
                        //res.data({});
                    } else{
                        if(callback) {
                            callback(publishPath, html);
                        }
                        //res.data({publish: putDoc["$set"].publish});
                    }
                });
            });
        });
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
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
        var filterData = function(data, queryFormat, mediaFormat) {
            if(queryFormat) {
                if(queryFormat == 'rss') {
                    _.each(data, function(e,i,c) {
                        var rssEntry = {title: '', pubDate: '', desc: ''};
                        if(e.hasOwnProperty('title')) {
                            rssEntry.title = e.title;
                        }
                        if((!mediaFormat || mediaFormat == 'audio') && e.hasOwnProperty('audio')) {
                            rssEntry.media = e.audio;
                            rssEntry.itunes = {
                                //duration: ""
                                explicit: "yes",
                            }
                        }
                        if((!mediaFormat || mediaFormat == 'video') && e.hasOwnProperty('video')) {
                            rssEntry.media = e.video;
                            rssEntry.itunes = {
                                //duration: ""
                                explicit: "yes",
                            }
                        }
                        
                        if(e.owner && e.owner.name) {
                            rssEntry.author = e.owner.name;
                            //rssEntry.creator = e.owner.name;
                            if(rssEntry.hasOwnProperty('itunes')) {
                                rssEntry.itunes.author = e.owner.name;
                            }
                        }
                        if(e.at) {
                            rssEntry.pubDate = e.at;
                        }
                        
                        rssEntry.url = house.config.site.url+'posts/id/'+e.id;
                        var directUrl = house.config.site.url+'posts/';
                        if(e.hasOwnProperty('slug')) {
                            directUrl = directUrl + e.slug;
                        } else {
                            directUrl = directUrl + 'id/' + e.id;
                        }
                        
                        if(e.hasOwnProperty('msg')) {
                            rssEntry.desc = e.msg;
                            
                            if(e.hasOwnProperty('youtube')) {
                                var youtube = e.youtube;
                                var iframe = '<iframe width="640" height="480" src="https://www.youtube.com/embed/'+youtube.id+'?rel=0" frameborder="0" allowfullscreen></iframe>';
                                rssEntry.desc =  iframe+rssEntry.desc;
                            }
                            
                            if(rssEntry.hasOwnProperty('itunes')) {
                                rssEntry.itunes.summary = '<![CDATA['+e.msg+']]>';
                            }
                        }
                        if(e.owner.name) {
                            rssEntry.desc = rssEntry.desc + '<br /> <a href="'+directUrl+'" target="_new">post by '+e.owner.name+'</a>';
                        }
                        if(e.hasOwnProperty('seq')) {
                            if(rssEntry.hasOwnProperty('itunes')) {
                                //rssEntry.itunes.order = e.seq;
                            }
                        }
                        data[i] = rssEntry;
                    });
                }
            }
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
            
            var queryFormat = '';
            var mediaFormat;
            if(query.hasOwnProperty('_format')) {
                queryFormat = query['_format'];
                delete query['_format'];
                console.log('queryFormat');
                console.log(queryFormat);
            }
            if(query.hasOwnProperty('_media')) {
                mediaFormat = query['_media'];
                delete query['_media'];
                console.log('_media');
                console.log(mediaFormat);
                query[mediaFormat] = {$exists: true};
                console.log(query)
            }
            
            if(!query.hasOwnProperty('$or')) {
                query["$or"] = [];
            }
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            } else if(req.session.data.user) {
                query["$or"].push({"owner.id": req.session.data.user});
                if(req.session.data.groups) {
                    var orGroups = req.session.data.groups;
                    orGroups.push('public');
                    query["$or"].push({"groups": {$in: orGroups}});
                } else {
                    query["$or"].push({"groups": 'public'});
                }
            } else {
                //query["groups"] = 'public';
                query["$or"].push({"groups": 'public'});
            }
            if(query["$or"].length == 0) {
                delete query["$or"];
            }
            if(!query.hasOwnProperty('sort')) {
                query.sort = 'at-';
            }
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    data = filterData(data, queryFormat, mediaFormat);
                    res.data(data, queryFormat, mediaFormat);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {"col": "posts", "id": doc.id},
                "post": doc,
                "groups": doc.groups,
                "owner": doc.owner,
                "at": doc.at,
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
                    "post": doc,
                    "groups": doc.groups,
                    "owner": doc.owner,
                    "at": doc.at,
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
                var feedQuery = {"ref": {"col": "posts", "id": doc.id}};
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
    try {
            docId = new ObjectID(docId);
} catch(e) {
house.log.err(e);
}
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
                if(!query.hasOwnProperty('limit')) {
                    query.limit = 100;
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
            house.log.debug('post');
            if(path == '') {
                var newDoc = req.fields;
                newDoc.at = new Date();
                newDoc.owner = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                ds.insert(col, newDoc, function(err, data){
                    var respondWithFind = function(docId) {
                        var query = {_id: docId};
                        ds.find(col, query, function(err, docs) {
                            if (err) {
                                house.log.err(err);
                            } else {
                                // insert to feed
                                var updatedDoc = _.first(docs);
                                if(true) {
                                    var postPath = 'id/'+updatedDoc.id;
                                    console.log('postPath')
                                    console.log(postPath)
                                    if(updatedDoc.slug) {
                                        postPath = updatedDoc.slug;
                                    }
                                    if(updatedDoc.groups.indexOf('public') !== -1) {
                                        cachePostHtml(postPath);
                                    }
                                }
                                
                                insertDocToFeed(updatedDoc, function(feedDocs){
                                    var resWithDoc = updatedDoc;
                                    resWithDoc.feed = {id: feedDocs.id, at: feedDocs.at};
                                    resWithDoc = filterData(resWithDoc);
                                    res.data(resWithDoc);
                                    emitToRoomIn(col, 'inserted', resWithDoc);
                                });
                            }
                        });
                    }
                    incUserPosts(req.session.data.user, 1);
                    respondWithFind(data.id);
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
                if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('at')) {
                    putDoc["$set"].at = new Date(putDoc["$set"].at);
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
                            if(updateGroups) {
                            }
                            
                            var postPath = 'id/'+updatedDoc.id;
                            console.log('postPath')
                            console.log(postPath)
                            if(updatedDoc.slug) {
                                postPath = updatedDoc.slug;
                            }
                            if(updatedDoc.groups.indexOf('public') !== -1) {
                                cachePostHtml(postPath);
                            }
                            
                            var putRespond = function(data) {
                                if(insertToFeed) {
                                    insertDocToFeed(updatedDoc, function(feedDocs){
                                        var resWithDoc = updatedDoc;
                                        resWithDoc.feed = {id: feedDocs.id, at: feedDocs.at};
                                        res.data(resWithDoc);
                                        emitToRoomIn(col, 'updated', resWithDoc);
                                    });
                                } else if (updatedDoc.hasOwnProperty('feed')) {
                                    updateDocInFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoomIn(col, 'updated', updatedDoc);
                                } else if (removeFromFeed) {
                                    removeDocFromFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoomIn(col, 'updated', updatedDoc);
                                } else {
                                    data = filterData(data);
                                    res.data(data);
                                    emitToRoomIn(col, 'updated', data);
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
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['owner.id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    incUserPosts(req.session.data.user, -1);
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
