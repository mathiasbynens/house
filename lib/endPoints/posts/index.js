//
// # Posts Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
var mkdirp = require('mkdirp');
var moment = require('moment');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var colFiles = options.collectionFiles || 'files.files';
    var filesRoot = 'files';
    var usersCol = 'users';
    var imagesCol = 'images';
    var feedEndPoint = house.api.getEndPointByName("feed");
    
    var warmUpCache = 30000;
    if(house.config.hasOwnProperty('warmCache')) {
        warmUpCache = house.config.warmCache;
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
    var incUserPosts = function(userId, b) {
        incUserField(userId, 'postsCount', b);
    }
    
    var cacheDir = process.cwd() + "/cache" + "/posts/";
    var cacheSeqDir = process.cwd() + "/cache" + "/posts/seq/";
    mkdirp(cacheDir+'id', function (err) {
        if (err) {
                house.log.err('mkdirp cache posts error');
                house.log.err(err);
            } else {
                mkdirp(cacheSeqDir, function (err) {
                    if (err) {
                        house.log.err('mkdirp cache seq error');
                        house.log.err(err);
                    } else {
                        //
                    }
                });
            }
    });
    
    if(warmUpCache) { 
        house.log.debug('posts cache will warmup in '+warmUpCache);
        setTimeout(function(){
            house.log.debug('posts-warming up cache');
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
                        toCache.push(doc);
                    });
                    var cacheDone = function() {
                        house.log.debug('posts-done warming up cache');
                    }
                    var cacheOne = function(){
                        if(toCache.length > 0) {
                            cachePostHtml(toCache.pop(), function(){
                                house.log.debug('posts-cache another post...');
                                cacheOne();
                            });
                        } else {
                            cacheDone();
                        }
                    }
                    cacheOne();
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        },warmUpCache);
    }
    
    var cachePostHtml = function(doc, callback) {
        var postsPath = 'id/'+doc.id;
        var slugPublishPath = false;
        var seqPublishPath = false;
        if(doc.slug) {
            slugPublishPath = cacheDir+doc.slug+'.html';
        }
        if(cacheSeqDir && doc.seq) {
            seqPublishPath = cacheSeqDir+doc.seq+'.html';
        }
        var publishPath = cacheDir+postsPath+'.html';
        var phantomUrl = function(url, callback) {
            //console.log('pantom url '+url)
            var html = ''
            , title = ''
            , desc = '';
            var screenRes = '1024x768x24'; // 640x480x24
            //var phantomjs = spawn('xvfb-run', ['-as', '-screen 0 '+screenRes, 'phantomjs', __dirname+'/phantom.js', url]);
            //console.log('phantomjs '+__dirname+'/phantom.js '+url);
            var phantomjs = spawn('phantomjs', [__dirname+'/phantom.js', url]);
            phantomjs.stdout.on('data', function (data) {
              //console.log('phantomjs.stdout: ' + data);
              html += data.toString();
            });
              
            phantomjs.stderr.on('data', function (data) {
              console.log('posts-cache !phantomjs stderr: ' + data);
            });
              
            phantomjs.on('exit', function (code) {
                house.log.debug('posts-cache phantomjs process exited with code ' + code);
                callback(null, html, title);
            });
        }
        
        var procPhantom = function() {
            var postsUrl = house.config.site.url+"posts/"+postsPath;
            house.log.debug('posts-cache phantom posts url: '+postsUrl);
            phantomUrl(postsUrl, function(err, html, title) {
                //console.log(html);
                // to root web for now
                //console.log(publishPath);
                //return; // TODO
                house.log.debug('posts-cache writeFile posts path: '+publishPath);
                fs.writeFile(publishPath, html, function(err){
                    if(err) {
                        house.log.err(err);
                        //res.data({});
                    } else{
                        if(seqPublishPath) {
                            fs.writeFile(seqPublishPath, html, function(err){
                                house.log.debug('posts-cache writeFile seq path: '+seqPublishPath);
                            });
                        }
                        if(slugPublishPath) {
                            fs.writeFile(slugPublishPath, html, function(err){
                                house.log.debug('posts-cache writeFile slug path: '+slugPublishPath);
                                if(callback) {
                                    callback(publishPath, html);
                                }
                            });
                        } else {
                            if(callback) {
                                callback(publishPath, html);
                            }
                        }
                        //res.data({publish: putDoc["$set"].publish});
                    }
                });
            });
        }
        
        //house.log.debug('posts-cache phantomUrl: '+house.config.site.url+"posts/"+postsPath);
        
        fs.unlink(publishPath, function(err){
            if(slugPublishPath) {
                fs.unlink(slugPublishPath, function(err){
                    procPhantom();
                });
            } else {
                procPhantom();
            }
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
        var filterQuery = function(query) {
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
            if(query.hasOwnProperty('seq')) {
                query.seq = parseInt(query.seq, 10);
            }
            return query;
        }
        
        var countQuery = function(query) {
            query = filterQuery(query);
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
                    var rssData = [];
                    _.each(data, function(e,i,c) {
                        var rssEntry = {title: '', pubDate: '', desc: ''};
                        if(e.hasOwnProperty('title')) {
                            rssEntry.title = e.title;
                        }
                        if((!mediaFormat || mediaFormat == 'audio') && e.hasOwnProperty('audio') && e.audio) {
                            rssEntry.media = {
                                url: house.config.site.url+'api/files/'+e.audio.filename,
                                length: e.audio.length,
                                contentType: e.audio.contentType
                            };
                            if(e.audio.metadata && e.audio.metadata.duration) {
                                rssEntry.media.duration = e.audio.metadata.duration;
                            }
                            rssEntry.itunes = {
                                //duration: ""
                                explicit: "yes"
                            };
                        }
                        if((!mediaFormat || mediaFormat == 'video') && e.hasOwnProperty('video') && e.video) {
                            rssEntry.media = {
                                filename: house.config.site.url+'api/files/'+e.video.filename,
                                length: e.video.length,
                                contentType: e.video.contentType
                            };
                            if(e.video.metadata && e.video.metadata.duration) {
                                rssEntry.media.duration = e.video.metadata.duration;
                            }
                            rssEntry.itunes = {
                                //duration: ""
                                explicit: "yes"
                            };
                        }
                        
                        // WISTIA
                        if((!mediaFormat || mediaFormat == 'audio') && e.hasOwnProperty('wistiaAudio') && e.wistiaAudio.id) {
                            var w = e.wistiaAudio;
                            var thumbUrl = '';
                            var a;
                            
                            if(w.assets && w.assets.length > 0) {
                                for(var i in w.assets) {
                                    var asset = w.assets[i];
                                    if(asset.url && asset.type == 'OriginalFile') {
                                        a = asset;
                                    }
                                }
                            }
                            if(a) {
                                var url = a.url;
                                if(url.indexOf('.bin') !== -1) {
                                    var fileExt = a.contentType.substr(a.contentType.indexOf('/')+1);
                                    url = url.substr(0, url.length-4)+'/audio.mp3'; //+fileExt;
                                }
                                rssEntry.media = {
                                    url: url,
                                    length: a.fileSize,
                                    contentType: a.contentType
                                }; 
                                if(w.duration) {
                                    rssEntry.media.duration = w.duration;
                                }
                            }
                            rssEntry.itunes = {
                                explicit: "yes"
                            };
                            
                            if(e.hasOwnProperty('wistia') && e.wistia.id) {
                                var wistiaVideo = e.wistia;
                                if(wistiaVideo.thumbnail && wistiaVideo.thumbnail.url) {
                                    thumbUrl = wistiaVideo.thumbnail.url;
                                    var queryPos = thumbUrl.indexOf('?');
                                    if(queryPos !== -1) {
                                        thumbUrl = thumbUrl.substr(0, queryPos); // strip query
                                    }
                                    rssEntry.itunes.image = thumbUrl;
                                }
                            }
                        }
                        if((!mediaFormat || mediaFormat == 'video') && e.hasOwnProperty('wistia') && e.wistia.id) {
                            var w = e.wistia;
                            var thumbUrl = '';
                            var a;
                            
                            if(w.assets && w.assets.length > 0) {
                                for(var i in w.assets) {
                                    var asset = w.assets[i];
                                    if(asset.url && asset.type == 'OriginalFile') {
                                        a = asset;
                                    }
                                }
                            }
                            if(a) {
                                var url = a.url;
                                if(url.indexOf('.bin') !== -1) {
                                    var fileExt = a.contentType.substr(a.contentType.indexOf('/')+1);
                                    url = url.substr(0, url.length-4)+'/video.'+fileExt;
                                }
                                rssEntry.media = {
                                    url: url,
                                    length: a.fileSize,
                                    contentType: a.contentType
                                }; 
                                if(w.duration) {
                                    rssEntry.media.duration = w.duration;
                                }
                            }
                            rssEntry.itunes = {
                                explicit: "yes"
                            };
                            if(w.thumbnail && w.thumbnail.url) {
                                thumbUrl = w.thumbnail.url;
                                var queryPos = thumbUrl.indexOf('?');
                                if(queryPos !== -1) {
                                    thumbUrl = thumbUrl.substr(0, queryPos); // strip query
                                }
                                rssEntry.itunes.image = thumbUrl;
                            }
                        }
                        
                        
                        if(e.hasOwnProperty('avatar') && e.avatar && rssEntry.hasOwnProperty('itunes')) {
                            rssEntry.itunes.image = house.config.site.url+'api/files/'+e.avatar.filename;
                        }
                        
                        if(e.owner && e.owner.name) {
                            rssEntry.author = e.owner.name;
                            //rssEntry.creator = e.owner.name;
                            if(rssEntry.hasOwnProperty('itunes')) {
                                rssEntry.itunes.author = e.owner.name;
                            }
                        }
                        if(e.at) {
                            rssEntry.pubDate = moment(e.at).format("ddd, DD MMM YYYY HH:mm:ss ZZ");
                        }
                        
                        rssEntry.url = house.config.site.url+'posts/id/'+e.id;
                        rssEntry.guid = house.config.site.url+'posts/id/'+e.id;
                        var directUrl = house.config.site.url+'posts/';
                        if(e.hasOwnProperty('slug')) {
                            directUrl = directUrl + e.slug;
                            rssEntry.url = directUrl;
                        } else {
                            directUrl = directUrl + 'id/' + e.id;
                        }
                        
                        if(e.hasOwnProperty('msg')) {
                            rssEntry.desc = e.msg;
                            
                            if(e.hasOwnProperty('youtube')) {
                                var youtube = e.youtube;
                                if(youtube.id) {
                                    var iframe = '<iframe width="640" height="480" src="https://www.youtube.com/embed/'+youtube.id+'?rel=0" frameborder="0" allowfullscreen></iframe>';
                                    rssEntry.desc =  iframe+rssEntry.desc;
                                }
                            }
                            
                            if(rssEntry.hasOwnProperty('itunes')) {
                                rssEntry.itunes.summary = e.msg;
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
                        
                        console.log(i)
                        //data[i-1] = rssEntry;
                        rssData.push(rssEntry);
                    });
                    data = rssData;
                }
            }
            console.log('--data---');
            console.log(data);
            return data;
        }
        var findQuery = function(query) {
            query = filterQuery(query);
            var queryFormat = '';
            var mediaFormat;
            if(query.hasOwnProperty('_format')) {
                queryFormat = query['_format'];
                delete query['_format'];
                //console.log('queryFormat');
                //console.log(queryFormat);
                if(queryFormat == 'rss') {
                    query.limit = 5;
                }
            }
            if(query.hasOwnProperty('_media')) {
                mediaFormat = query['_media'];
                delete query['_media'];
                //console.log('_media');
                //console.log(mediaFormat);
                if(mediaFormat == 'video') {
                    query["$or"] = [{mediaFormat: {$exists: true}}, {'wistia': {$exists: true}}];
                } else if(mediaFormat == 'audio') {
                    query["$or"] = [{mediaFormat: {$exists: true}}, {'wistiaAudio': {$exists: true}}];
                } else {
                    query[mediaFormat] = {$exists: true};
                }
                //console.log(query)
            }
            
            var groupsQuery;
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            } else if(req.session.data.user) {
                groupsQuery = [];
                groupsQuery.push({"owner.id": req.session.data.user});
                if(req.session.data.groups) {
                    var orGroups = req.session.data.groups;
                    orGroups.push('public');
                    groupsQuery.push({"groups": {$in: orGroups}});
                } else {
                    groupsQuery.push({"groups": 'public'});
                }
            } else {
                query["groups"] = 'public';
                //query["$or"].push({"groups": 'public'});
            }
            if(groupsQuery && groupsQuery.length > 0) {
                if(!query.hasOwnProperty('$or')) {
                    query["$or"] = groupsQuery;
                } else {
                    // TODO
                    query["$and"] = [];
                    query["$and"].push({
                        "$or": query["$or"]
                    });
                    query["$and"].push({
                        "$or": groupsQuery
                    })
                }
            } 
            
            if(query.hasOwnProperty("$or") && query["$or"] && query["$or"].length == 0) {
                delete query["$or"];
            }
            
            if(!query.hasOwnProperty('sort')) {
                query.sort = 'at-';
            }
            console.log(query)
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
                                    //console.log('postPath')
                                    //console.log(postPath)
                                    if(updatedDoc.slug) {
                                        postPath = updatedDoc.slug;
                                    }
                                    if(updatedDoc.hasOwnProperty('groups') && updatedDoc.groups.indexOf('public') !== -1) {
                                        cachePostHtml(updatedDoc);
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
                var procWistiaVideo = false;
                var procWistiaAudio = false;
                
                for(var k in putDoc) {
                    if(putDoc.hasOwnProperty(k) && k.substr(0,1) == '$') {
                        for(var colName in putDoc[k]) {
                            if(colName == 'groups') {
                                updateGroups = true;
                            }
                            if(colName == 'owner') {
                                
                            }
                            if(colName == 'wistia') {
                                procWistiaVideo = putDoc[k][colName].id;
                            }
                            if(colName == 'wistiaAudio') {
                                procWistiaAudio = putDoc[k][colName].id;
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
                var doUpadte = function() {
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
                                
                                var postPath = 'id/'+updatedDoc.id;
                                console.log('postPath')
                                console.log(postPath)
                                if(updatedDoc.slug) {
                                    postPath = updatedDoc.slug;
                                }
                                if(updatedDoc.groups && updatedDoc.groups.indexOf('public') !== -1) {
                                    cachePostHtml(updatedDoc);
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
                // http://wistia.com/doc/data-api#media_show
                var getWistiaMedia = function(id, callback) {
                    if(house.config.wistia) {
                        var user = house.config.wistia.user || 'api'; // always "api"
                        var pass = house.config.wistia.pass;
                    } else {
                        if(callback) {
                            callback();
                        }
                        return;
                    }
                    var https = require('https');
                    var getOpts = { host: 'api.wistia.com', path: '/v1/medias/'+id+'.json?api_password='+pass };
                    var responsTxt = '';
                    https.get(getOpts, function(res) {
                      console.log("statusCode: ", res.statusCode);
                      console.log("headers: ", res.headers);
                    
                      res.on('data', function(data) {
                        //process.stdout.write(data);
                        //console.log(typeof data);
                        responsTxt = responsTxt + data.toString();
                      });
                      res.on('end', function() {
                        try {
                            var data = JSON.parse(responsTxt);
                        } catch(e) {
                            house.log.err('wistia json parse err');
                            house.log.err(e);
                        }
                        console.log(data);
                        if(callback) {
                            callback(data);
                        }
                      });
                    
                    }).on('error', function(e) {
                        house.log.err('err with wistia get');
                        house.log.err(e);
                      //console.error(e);
                      if(callback) {
                            callback();
                        }
                    });
                }
                if(procWistiaVideo) {
                    getWistiaMedia(procWistiaVideo, function(data){
                        data.id = data.hashed_id;
                        putDoc["$set"]["wistia"] = data;
                        if(procWistiaAudio) {
                            getWistiaMedia(procWistiaAudio, function(audioData){
                                audioData.id = audioData.hashed_id;
                                putDoc["$set"]["wistiaAudio"] = audioData;
                                doUpadte();
                            });
                        } else {
                            doUpadte();
                        }
                    });
                } else if(procWistiaAudio) {
                    getWistiaMedia(procWistiaAudio, function(data){
                        data.id = data.hashed_id;
                        putDoc["$set"]["wistiaAudio"] = data;
                        doUpadte();
                    });
                } else {
                    doUpadte();
                }
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
    
    if(house.config.google && house.config.google.analytics && house.config.google.analytics.id) {
        var ga = require('node-ga-plus')(house.config.google.analytics.id, { safe : false, cookie_name: "SID" });
    }
    if(ga) {
        var analyticsReq = function(req, res, next) {
            console.log(req.url);
            
            if(req.url.indexOf('_format=rss') !== -1) {
                ga(req, res, function() {
                    handleReq(req,res,next);
                });
            } else {
                handleReq(req,res,next);
            }
        }
        
        house.log.info('using google analytics for posts endpoint');
        return analyticsReq;
    } else {
        return handleReq;
    }
});
