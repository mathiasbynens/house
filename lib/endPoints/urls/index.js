//
// # URLs Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var colFiles = options.collectionFiles || 'files.files';
    var filesRoot = 'files';
    var usersCol = 'users';
    var imagesCol = 'images';
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
        var updateDoc = {"$inc":{field: b}};
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserUrls = function(userId, field, b) {
        incUserField(userId, 'urlsCount', b);
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
        
        var countQuery = function(query, callback) {
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
                    if(callback) {
                        callback(data);
                    } else {
                        res.setHeader('X-Count', data);
                        res.data({});
                    }
                }
            });
        }
        var filterData = function(data) {
            if(!_.isArray(data)) {
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
            }
            return data;
        }
        var findQuery = function(query, callback) {
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
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    data = filterData(data);
                    if(callback) {
                        callback(data);
                    } else {
                        res.data(data);
                    }
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {"col": "urls", "id": doc.id},
                "url": doc,
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
                    "url": doc,
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
                var feedQuery = {"ref": {"col": "urls", "id": doc.id}};
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
        
        var processUrls = function(urls, callback) {
            var updateUrlWithDoc = function(updateUrlDoc) {
                ds.update(col, {"_id": url.id}, updateUrlDoc, function(err, updateData) {
                    ds.find(col, {"_id": url.id}, function(err, updatedData) {
                        if(err) {
                            callback(err);
                        } else {
                            if(updatedData.length > 0) {
                                if(callback) {
                                    callback(null, _.first(updatedData));
                                }
                            }
                        }
                    });
                });
            }
            console.log(urls);
            var url;
            if(_.isArray(urls)) {
                url = _.first(urls);
            } else {
                url = urls;
            }
            var metadata = {
                refs:[{col: col, id: url.id}],
                src: "urls"
            };
            if(url.hasOwnProperty('groups')) {
                metadata.groups = url.groups;
            }
            if(url.hasOwnProperty('tags')) {
                metadata.tags = url.tags;
            }
            if(url.hasOwnProperty('owner')) {
                metadata.owner = url.owner;
            }
            house.utils.media.gridfs.importUrl(ds.db, 'files', url.url, metadata, function(err, gridfile){
                console.log('house.utils.media.gridfs.importUrl imported');
                console.log(arguments);
                if(err) {
                    house.log.err(err);
                } else {
                    // update url with file
                    var updateUrlDoc = {
                        "$set": {
                            file: {
                                id: gridfile._id,
                                name: gridfile.filename,
                                contentType: gridfile.contentType
                            },
                            proc: 1
                        }
                    };
                    // proc files of type image
                    if(gridfile.contentType.indexOf('image') !== -1) {
                        console.log('proc image url');
                        var filesEndPoint = house.api.getEndPointByName('files');
                        filesEndPoint.call(this, {session: req.session, method: 'PUT', url: '/'+gridfile._id, fields: {"$set":{"metadata.proc":0}}}, {end:function(){}, data:function(resData){
                            console.log('files response for file '+gridfile._id);
                            console.log(resData);
                            if(resData.hasOwnProperty('image')) {
                                updateUrlDoc["$set"].image = resData.image;
                            }
                            updateUrlWithDoc(updateUrlDoc);
                        },writeHead:function(){}});
                    } else if(gridfile.contentType == 'text/html') {
                        //phantom it up
                        
                        var phantomUrl = function(url, callback) {
                            var html = ''
                            , title = ''
                            , desc = '';
                            var fullPath = '/tmp/'+encodeURIComponent(url)+'.png';
                            var screenRes = '1024x768x24'; // 640x480x24
                            var phantomjs = spawn('xvfb-run', ['-as', '-screen 0 '+screenRes, 'phantomjs', __dirname+'/phantom.js', url, fullPath]);
                            phantomjs.stdout.on('data', function (data) {
                              //console.log('phantomjs.stdout: ' + data);
                              html += data.toString();
                              if(title == '') {
                                var matches = html.match(/Page\sTitle:\s(.*)/);
                                if(matches) {
                                  title = matches[1];
                                }
                              }
                            });
                              
                            phantomjs.stderr.on('data', function (data) {
                              console.log('!phantomjs stderr: ' + data);
                            });
                              
                            phantomjs.on('exit', function (code) {
                              console.log('phantomjs process exited with code ' + code);
                              if(html){ // good
                              
                                if(title != '') {
                                    console.log('url phantom got title: '+title);
                                    html = html.substr(html.indexOf(title)+title.length);
                                }
                                  
                              }
                                callback(null, fullPath, html, title);
                            });
                        }
                        
                        phantomUrl(url.url, function(err, phantomImagePath, html, title) {
                            if(err) {
                                house.log.err(err);
                            } else {
                                
                                if(title) {
                                    updateUrlDoc["$set"].title = title;
                                }
                                
                                var timeFromToday = new Date();
                                var updateRate = url.updateRate || 30*24*60*60*1000;
                                timeFromToday.setTime(timeFromToday.getTime()+updateRate);
                                updateUrlDoc["$set"].lastUpdate = new Date();
                                updateUrlDoc["$set"].nextUpdate = timeFromToday;
                                updateUrlDoc["$set"].updateRate = updateRate;
                                var fileMeta = {
                                    owner: url.owner,
                                    src: "urls"
                                }
                                if(url.groups) {
                                    fileMeta.groups = url.groups;
                                }
                                house.utils.media.fs.getFileMime(phantomImagePath, function(err, mimeType) {
                                    house.utils.media.gridfs.importFile(ds.db, filesRoot, 'urls/'+encodeURIComponent(url.url)+'.png', phantomImagePath, mimeType, fileMeta, function(err, data){
                                        console.log('gridfs import file upload done');
                                        console.log(data)
                                        data.id = data._id;
                                        delete data._id;
                                        if(err) {
                                            console.log('file upload err');
                                            console.log(err);
                                        } else {
                                            
                                            var filesEndPoint = house.api.getEndPointByName('files');
                                            filesEndPoint.call(this, {session: req.session, method: 'PUT', url: '/'+data.id, fields: {"$set":{"metadata.proc":0}}}, {end:function(){}, data:function(resData){
                                                console.log('files response for file '+data.id);
                                                console.log(resData);
                                                if(resData.hasOwnProperty('image')) {
                                                    updateUrlDoc["$set"].image = resData.image;
                                                    updateUrlDoc["$push"] = {
                                                      "updates": {
                                                       "src": html
                                                        , "at": new Date()
                                                        , "image": resData.image
                                                      }
                                                    };
                                                }
                                                updateUrlWithDoc(updateUrlDoc);
                                            },writeHead:function(){}});
                                        }
                                    });
                                });
                            }
                        });
                    } else {
                        updateUrlWithDoc(updateUrlDoc);
                    }
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
            house.log.debug('post');
            if(path == '') {
                var newDoc = req.fields;
                
                if(!newDoc.hasOwnProperty('url')) {
                    res.writeHead(500);
                    res.end('{"error": "requires url"}');
                    return;
                }
                
                var query = {url: newDoc.url};
                findQuery(query, function(data){
                    if(data.length > 0) {
                        house.log.debug('url exists');
                        res.data(_.first(data));
                    } else {
                        var respondWithFind = function(doc) {
                            var query = {_id: doc.id};
                            ds.find(col, query, function(err, docs) {
                                if (err) {
                                    house.log.err(err);
                                } else {
                                    // insert to feed
                                    insertDocToFeed(_.first(docs), function(feedDocs){
                                        var resWithDoc = _.first(docs);
                                        resWithDoc.feed = {id: feedDocs.id, at: feedDocs.at};
                                        resWithDoc = filterData(resWithDoc);
                                        res.data(resWithDoc);
                                        emitToRoomIn(col, 'inserted', resWithDoc);
                                    });
                                }
                            });
                        }
                        
                        house.log.debug('new url');
                        newDoc.at = new Date();
                        newDoc.owner = {
                            id: req.session.data.user,
                            name: req.session.data.name
                        }
                        ds.insert(col, newDoc, function(err, data){
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                incUserUrls(req.session.data.user, 1);
                                var procOnPost = true;
                                if(procOnPost) {
                                    processUrls(data, function(err, data){
                                        respondWithFind(data);
                                    });
                                } else {
                                    respondWithFind(data);
                                }
                            }
                        });
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
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            if(updateGroups) {
                                var updateFilesDoc = false;
                                var updateCheckinDoc = false;
                                if(updatedDoc.hasOwnProperty('groups')) {
                                    var updateFilesDoc = {
                                        "$set": {"metadata.groups": updatedDoc.groups}
                                    }
                                    var updateCheckinDoc = {
                                        "$set": {"groups": updatedDoc.groups}
                                    }
                                    ds.update(colFiles, {
                                        "metadata.refs": {
                                            col: "urls",
                                            id: docId
                                        }
                                    }, updateFilesDoc, {
                                        multi: true,
                                        safe: true
                                    }, function(err, docs){
                                        house.log.debug('updated files with new groups via url');
                                    });
                                }
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
                                    res.data(data);
                                    emitToRoomIn(col, 'updated', data);
                                }
                            }
                            if(doProc) {
                                processUrls(data, function(err, data){
                                    data = filterData(data);
                                    putRespond(data);
                                });
                            } else {
                                data = filterData(data);
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
                    removeDocFromFeed(doc);
                    ds.remove(col, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            incUserUrls(req.session.data.user, -1);
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
