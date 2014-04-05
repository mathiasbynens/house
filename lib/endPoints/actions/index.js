//
// # Actions Collection API Endpoint
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
    var urlsCol = 'urls';
    
    if(!house.config.forkedFeedFetcher) {
        if(house.config.site.sysadmin && house.config.site.sysadmin.dailyDigest && house.config.site.sysadmin.email) {
            var actionEmail = require('./email')(house, options).email;
            actionEmail.initDailyDigest();
            actionEmail.subscribeToDailyDigest({email: house.config.site.sysadmin.email});
        }
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
    var incUserActions = function(userId, b) {
        incUserField(userId, 'actionsCount', b);
    }
    var updateUrl = function (url, updateDoc, cb) {
        ds.update(urlsCol, {url: url}, updateDoc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incSessionUrlView = function(sessionId, url) {
        // dont care what sessionId =\ ?
        var updateDoc = {"$inc":{}};
        updateDoc["$inc"]["views"] = 1;
        updateUrl(url, updateDoc);
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var feedEndPoint = house.api.getEndPointByName("feed");
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
            if(query.hasOwnProperty('s') && typeof query.s == 'string') {
                try {
                    query.s = new ObjectID(query.s);
                } catch(e) {
                    console.log('bad object id for s');
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
            if(query.hasOwnProperty('s') && typeof query.s == 'string') {
                try {
                    query.s = new ObjectID(query.s);
                } catch(e) {
                    console.log('bad object id for s');
                }
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
            //house.log.debug('post action');
            if(path == '') {
                var newDoc = req.fields;
                newDoc.s = req.session.data.id;
                newDoc.t = 1;
                var a = newDoc.a;
                //console.log(a);
                
                var urlShareStr = '/urls/share/';
                var externalUrl = '';
                if(a.indexOf('EXIT ') !== -1) {
                    externalUrl = a.substr(a.lastIndexOf(' TO ')+4);
                    //console.log('External URL EXIT '+externalUrl);
                }
                if(a.indexOf('VIEW ') === 0 && a.indexOf(' FROM ') !== -1) {
                    externalUrl = a.substring(5, a.indexOf(' FROM '));
                    //console.log('External URL VIEW '+externalUrl);
                }
                /*if(a.indexOf('GET ') === 0 && a.indexOf('/urls/share/') !== -1) {
                    externalUrl = decodeURIComponent(a.substr(a.indexOf(urlShareStr)+urlShareStr.length));
                    console.log('External URL from GET '+externalUrl);
                }*/
                if(externalUrl) {
                    // log URL "view"
                    incSessionUrlView(req.session.data.id, externalUrl);
                }
                ds.insert(col, newDoc, function(err, data){
                    emitToRoomIn(col, 'inserted', data);
                    //incUserActions(req.session.data.user, 1);
                    //res.data(data);
                    res.data({});
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
                            var updatedDoc = _.first(data);
                            house.log.debug(data);
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
