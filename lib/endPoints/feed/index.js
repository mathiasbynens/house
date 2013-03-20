//
// # Feed Collection API Endpoint
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
    var incUserFeed = function(userId, b) {
        incUserField(userId, 'feedCount', b);
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
        var filterData = function(data, queryFormat) {
            if(queryFormat) {
                if(queryFormat == 'rss') {
                    _.each(data, function(e,i,c) {
                        var rssEntry = {title: '', pubDate: '', desc: ''};
                        
                        if(e.owner && e.owner.name) {
                            rssEntry.author = e.owner.name;
                        }
                        if(e.at) {
                            rssEntry.pubDate = e.at;
                        }
                        
                        rssEntry.url = house.config.site.url+'feed/item/'+e.id;
                        if(e.hasOwnProperty('post')) {
                            var directUrl = house.config.site.url+'posts/';
                            if(e.post.hasOwnProperty('slug')) {
                                directUrl = directUrl + e.post.slug;
                            } else {
                                directUrl = directUrl + 'post/' + e.post.id;
                            }
                            
                            if(e.post.hasOwnProperty('title')) {
                                rssEntry.title = e.post.title;
                            }
                            if(e.post.hasOwnProperty('msg')) {
                                rssEntry.desc = e.post.msg;
                            }
                            if(e.owner.name) {
                                rssEntry.desc = rssEntry.desc + '<br /><a href="'+directUrl+'" target="_new">post by '+e.owner.name+'</a>';
                            }
                        }
                        if(e.hasOwnProperty('image')) {
                            var directUrl = house.config.site.url+'images/image/'+e.image.id;
                            rssEntry.title = e.image.caption || '';
                            var imgFilename = e.image.filename;
                            if(e.image.hasOwnProperty('sizes')) {
                                for(var sizeName in e.image.sizes) {
                                    if(sizeName == 'thumb') {
                                        imgFilename = e.image.sizes[sizeName].filename;
                                    }
                                }
                            }
                            rssEntry.desc = '<img src="'+house.config.site.url+'api/files/'+imgFilename+'" />';
                            if(e.owner.name) {
                                rssEntry.desc = rssEntry.desc + '<br /><a href="'+directUrl+'" target="_new">image by '+e.owner.name+'</a>';
                            }
                        }
                        if(e.hasOwnProperty('url')) {
                            var directUrl = house.config.site.url+'urls/'+e.url.url;
                            rssEntry.title = e.url.title || '';
                            
                            if(e.url.hasOwnProperty('image')) {
                                var imgFilename = e.url.image.filename;
                                if(e.url.image.hasOwnProperty('sizes')) {
                                    for(var sizeName in e.url.image.sizes) {
                                        if(sizeName == 'thumb') {
                                            imgFilename = e.url.image.sizes[sizeName].filename;
                                        }
                                    }
                                }
                                rssEntry.desc = rssEntry.desc + '<a href="'+e.url.url+'" target="_new"><img src="'+house.config.site.url+'api/files/'+imgFilename+'" /></a><br />';
                            }
                            
                            var a = e.url.title || e.url.url;
                            rssEntry.desc = rssEntry.desc + '<a href="'+e.url.url+'" target="_new">'+a+'</a>';
                            if(e.owner.name) {
                                rssEntry.desc = rssEntry.desc + '<br /><a href="'+directUrl+'" target="_new">bookmark by '+e.owner.name+'</a>';
                            }
                        }
                        if(e.hasOwnProperty('checkin')) {
                            var directUrl = house.config.site.url+'checkins/checkin/'+e.checkin.id;
                            rssEntry.title = e.checkin.msg || '';
                            if(e.checkin.hasOwnProperty('mapImage')) {
                                var imgFilename = e.checkin.mapImage.filename;
                                if(e.checkin.mapImage.hasOwnProperty('sizes')) {
                                    for(var sizeName in e.checkin.mapImage.sizes) {
                                        if(sizeName == 'thumb') {
                                            imgFilename = e.checkin.mapImage.sizes[sizeName].filename;
                                        }
                                    }
                                }
                                rssEntry.desc = rssEntry.desc + '<a href="'+rssEntry.url+'" target="_new"><img src="'+house.config.site.url+'api/files/'+imgFilename+'" /></a>';
                            }
                            
                            if(e.owner.name) {
                                rssEntry.desc = rssEntry.desc + '<br /><a href="'+directUrl+'" target="_new">checkin by '+e.owner.name+'</a>';
                            }
                        }
                        data[i] = rssEntry;
                    });
                    console.log(data);
                }
            }
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
            var queryFormat = '';
            if(query.hasOwnProperty('_format')) {
                queryFormat = query['_format'];
                delete query['_format'];
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
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    data = filterData(data, queryFormat);
                    res.data(data, queryFormat);
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
            house.log.debug('post');
            if(path == '') {
                var newDoc = req.fields;
                if(!newDoc.hasOwnProperty('at')) {
                    newDoc.at = new Date();
                }
                newDoc.owner = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                ds.insert(col, newDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        incUserFeed(req.session.data.user, 1);
                        res.data(data);
                        emitToRoomIn(col, 'inserted', data);
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
                for(var k in putDoc) {
                    if(putDoc.hasOwnProperty(k) && k.substr(0,1) == '$') {
                        for(var colName in putDoc[k]) {
                            if(colName == 'groups') {
                                updateGroups = true;
                            }
                            if(colName == 'owner') {
                                
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
                            house.log.debug(data);
                            if(updateGroups) {
                            }
                            if(doProc) {
                                processUrls(data, function(err, data){
                                    data = filterData(data);
                                    res.data(data);
                                    emitToRoomIn(col, 'updated', data);
                                });
                            } else {
                                data = filterData(data);
                                res.data(data);
                                emitToRoomIn(col, 'updated', data);
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
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        incUserFeed(req.session.data.user, -1);
                        res.data(data);
                        emitToRoomIn(col, 'deleted', docId);
                    }
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    
    return handleReq;
});
