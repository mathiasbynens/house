//
// # Contacts Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options) {

    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection || 'polls';
    var colFiles = options.collectionFiles || 'files.files';
    var filesRoot = 'files';
    var usersCol = 'users';
    var imagesCol = 'images';
    var qsPrefix = 'qs';

    var updateUserIdWithDoc = function(userId, doc, cb) {
        ds.update(usersCol, {
            _id: userId
        }, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incUserField = function(userId, field, b) {
        b = b || 1;
        var updateDoc = {
            "$inc": {}
        };
        updateDoc["$inc"][field] = b;
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserColCount = function(userId, b) {
        incUserField(userId, col + 'Count', b);
    }

    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;

        var filterQuery = function(query) {
            // if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            //     if(!query.hasOwnProperty('owner.id') && !query.hasOwnProperty('owner')) {
            //         query["owner.id"] = req.session.data.user;
            //     }
            //     //} else if(req.session.data.user) {
            // } else {
            //     query["owner.id"] = req.session.data.user;
            // }
            return query;
        }

        var countQuery = function(query) {
            query = filterQuery(query);
            ds.count(col, query, function(err, data) {
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

            query = filterQuery(query);
            ds.find(col, query, function(err, data) {
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

        var respondWithFindFromId = function(docId) {
            var query = {
                _id: docId
            };
            ds.find(col, query, function(err, docs) {
                if(err) {
                    house.log.err(err);
                } else {
                    var resWithDoc = _.first(docs);
                    resWithDoc = filterData(resWithDoc);
                    res.data(resWithDoc);
                    // emitToRoomIn(col, 'inserted', resWithDoc);
                }
            });
        }

        var docId;
        var subPath = false;
        var qsPrefix = '/qs';

        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            var subSlashI = docId.indexOf('/');

            if(subSlashI !== -1) {
                docId = docId.substr(0, subSlashI);
                docId = new ObjectID(docId);

                subPath = path.substr(subSlashI + 1);
            } else {
                docId = new ObjectID(docId);
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
            house.log.debug('POST | ' + col);

            if(subPath && subPath === qsPrefix) {
                var newObj = req.fields;
                ds.find(col, {
                    _id: docId
                }, function(err, docs) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        if(_.isArray(docs)) {
                            var doc = _.first(docs);
                            var qs = doc.qs;
                            if(!newObj.hasOwnProperty('id')) {
                                var d = new Date();
                                newObj.id = d.getTime().toString();
                            }
                            if(!newObj.hasOwnProperty('rank')) {
                                newObj.rank = qs.length;
                            }

                            ds.update(col, {
                                _id: docId
                            }, {
                                $push: {
                                    qs: newObj
                                }
                            }, function(err, data) {
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

                    var insertNewDocAndRespond = function() {
                        ds.insert(col, newDoc, function(err, data) {
                            house.log.debug('inserted new ' + col);
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
            if(docId) {
                query._id = docId;
                if(subPath && subPath.indexOf(qsPrefix) === 0) {
                    house.log.debug('subPath of qsPrefix');
                    // pull out the given group
                    var qsPathId = subPath.substr(qsPrefix.length + 1);
                    house.log.debug(qsPathId);

                    query['qs.id'] = qsPathId;
                    var updateDoc = {};

                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {
                            "$set": {}
                        };
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['qs.$.' + i] = req.fields['$set'][i];
                            }
                        }
                    }
                    if(updateDoc == {}) return;
                    ds.update(col, query, updateDoc, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            // house.log.debug(data);
                            // house.log.debug('io emit pages updated feature');
                            // emitToRoomIn(col, 'updated', data);
                            // respondWithFindFromId(docId);
                            var query = {
                                _id: docId
                            };
                            ds.find(col, query, function(err, docs) {
                                if(err) {
                                    house.log.err(err);
                                } else {
                                    var resWithDoc = _.first(docs);
                                    resWithDoc = filterData(resWithDoc);
                                    for(var q in resWithDoc.qs) {
                                        var qs = resWithDoc.qs[q];
                                        if(qs.id == qsPathId) {
                                            res.data(qs);
                                            return;
                                        }
                                    }
                                    // emitToRoomIn(col, 'inserted', resWithDoc);
                                }
                            });
                        }
                    });
                } else {
                    query._id = docId;
                    var putDoc = req.fields;
                    var updateGroups = false;
                    for(var k in putDoc) {
                        if(putDoc.hasOwnProperty(k) && k.substr(0, 1) == '$') {
                            for(var colName in putDoc[k]) {
                                if(colName == 'groups') {
                                    updateGroups = true;
                                }
                                if(colName == 'user') {

                                }
                                if(k == "$set" && colName == 'feed') {} else if(k == "$unset" && colName == 'feed') {}
                            }
                        }
                    }
                    var doProc = false;
                    if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('proc')) {
                        doProc = true;
                    }
                    ds.update(col, query, putDoc, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.log.debug(data);

                            ds.find(col, query, function(err, data) {
                                var updatedDoc = _.first(data);
                                house.log.debug(data);
                                var postDoc = {
                                    url: putDoc['$set']['url']
                                };
                                if(updatedDoc.hasOwnProperty('groups')) {
                                    postDoc.groups = updatedDoc.groups;
                                }
                                if(updateGroups) {}
                                var putRespond = function(data) {
                                    data = filterData(data);
                                    res.data(data);
                                    // emitToRoomIn(col, 'updated', data);
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
            if(docId && subPath && subPath.indexOf(qsPrefix) === 0) {
                // pull out the given image
                var subIdStr = subPath.substr(qsPrefix.length+1);
                console.log(subIdStr);
                query._id = docId;
                // var subId = new ObjectID(subIdStr);
                ds.update(col, query, {"$pull": {"qs": {"id": subIdStr}}}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data(data);
                });
                return;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    // incUserTags(req.session.data.user, -1);
                    // removeDocFromFeed(doc);
                    ds.remove(col, query, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                            // emitToRoomIn(col, 'deleted', docId);
                        }
                    });
                });

            }
        } else if(req.method == 'OPTIONS') {

        }
    }

    return handleReq;
});