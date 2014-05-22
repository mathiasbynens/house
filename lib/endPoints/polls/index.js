//
// # Contacts Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection || 'polls';
    var colFiles = options.collectionFiles || 'files.files';
    var filesRoot = 'files';
    var usersCol = 'users';
    var imagesCol = 'images';
    var qsPrefix = 'qs';
    
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
    var incUserColCount = function(userId, b) {
        incUserField(userId, col+'Count', b);
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
            
            if(subPath && subPath === qsPrefix) {
                var newObj = req.fields;
                ds.find(col, {_id: docId}, function(err, docs) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        if(_.isArray(docs)) {
                            var doc = _.first(docs);
                            var features = doc.features;
                            if(!newObj.hasOwnProperty('id')) {
                               var d = new Date();
                               newObj.id = d.getTime().toString();
                            }
                            if(!newObj.hasOwnProperty('rank')) {
                               newObj.rank = features.length;
                            }
                            
                            ds.update(col, {_id: docId}, {$push: {features: newObj}}, function(err, data){
                                res.data(newObj);
                            });
                        }
                    }
                });
            } else {
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
                            emitToRoomIn(col, 'inserted', resWithDoc);
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
                            incUserColCount(req.session.data.user, 1);
                            respondWithFindFromId(data.id);
                        }
                    });
                }
                
                insertNewDocAndRespond();
            }
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
            
            if(subPath && subPath.indexOf(qsPrefix) === 0) {
                house.log.debug('subPath of featurePrefix');
                // pull out the given group
                var featuresPathId = subPath.substr(featurePrefix.length+1);
                house.log.debug(featuresPathId);
                
                query['features.id'] = featuresPathId;
                var updateDoc = {};
                
                if(req.fields.hasOwnProperty('$set')) {
                    updateDoc = {"$set": {}};
                    for(var i in req.fields['$set']) {
                        if(i !== 'id') {
                            updateDoc['$set']['features.$.'+i] = req.fields['$set'][i];
                        }
                    }
                }
                if(updateDoc == {}) return;
                ds.update(col, query, updateDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        // house.log.debug(data);
                        // house.log.debug('io emit pages updated feature');
                        // emitToRoomIn(col, 'updated', data);
                        respondWithFind(query);
                    }
                });
            } else {
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
