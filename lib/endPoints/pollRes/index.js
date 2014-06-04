//
// # Contacts Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection || 'pollRes';
    var pollsCol = options.pollsCol || 'polls';
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
    var incPollResCount = function(id, c, cb) {
        c = c || 1;
        var doc = {
            "$inc": {
                "resCount": c
            }
        }
        ds.update(pollsCol, {_id: id}, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incPollQsResCount = function(poll_id, qs_id, c, cb) {
        var query = {};
        query._id = poll_id;
        query["qs.id"] = qs_id;
        var updateDoc = {"$inc":{}};
        updateDoc['$inc']['qs.$.resCount'] = c;
        ds.update(pollsCol, query, updateDoc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    
    var recalcPollQ = function(poll_id, qs_id) {
        house.log.debug('recalcPollQ')
        var responseCount = 0;
        var resSum = 0;
        var resMax = 0;
        var resMin = 0;
        var updateDoc = {"$set":{}};
        var updatePoll = function(updateDoc){
            ds.update(pollsCol, {_id: poll_id, "qs.id": qs_id}, updateDoc, function(){
                console.log('updated poll doc')
            });
        }
        ds.find(pollsCol, {_id: poll_id}, function(err, data){
            if(err) {
                house.log.err(err);
            } else {
                var poll = _.first(data);
                if(poll) {
                    var question;
                    var qs = poll.qs;
                    for(var i in qs) {
                        var q = qs[i];
                        if(q.id == qs_id) {
                            question = q;
                        }
                    }
                    
                    if(question) {
                        console.log(question)
                        var type = question.type;
                        console.log(type)
                        if(type === 'booleanYesNo') {
                            
                            // percent of yes
                            ds.find(col, {"qs.id": qs_id}, function(err, data){
                                for(var i in data) {
                                    var pollResponse = data[i];
                                    if(pollResponse.qs) {
                                        var pollResponseQuestion;
                                        for(var pri in pollResponse.qs) {
                                            var pollResQ = pollResponse.qs[pri];
                                            if(pollResQ.id == qs_id) {
                                                pollResponseQuestion = pollResQ;
                                            }
                                        }
                                        if(pollResponseQuestion && pollResponseQuestion.hasOwnProperty('vote')) {
                                            var vote = pollResponseQuestion.vote;
                                            responseCount = responseCount + 1;
                                            if(vote) { // only sum yes votes
                                                resSum = resSum + vote;
                                            }
                                            if(vote > resMax) {
                                                resMax = vote;
                                            }
                                            if(vote < resMax) {
                                                resMin = vote;
                                            }
                                        }
                                    }
                                }
                                
                                if(responseCount) {
                                    // update responseCount
                                    updateDoc["$set"]["qs.$.resCount"] = responseCount;
                                    updateDoc["$set"]["qs.$.resPercent"] = resSum / responseCount;
                                    updateDoc["$set"]["qs.$.resSum"] = resSum;
                                    // updateDoc["$set"]["qs.$.resMax"] = resMax;
                                    // updateDoc["$set"]["qs.$.resMin"] = resMin;
                                    
                                    updatePoll(updateDoc);
                                }
                            });
                            
                        } else if(type === 'number') {
                            
                            // get average
                            ds.find(col, {"qs.id": qs_id}, function(err, data){
                                for(var i in data) {
                                    var pollResponse = data[i];
                                    if(pollResponse.qs) {
                                        var pollResponseQuestion;
                                        for(var pri in pollResponse.qs) {
                                            var pollResQ = pollResponse.qs[pri];
                                            if(pollResQ.id == qs_id) {
                                                pollResponseQuestion = pollResQ;
                                            }
                                        }
                                        if(pollResponseQuestion && pollResponseQuestion.hasOwnProperty('vote')) {
                                            var vote = pollResponseQuestion.vote;
                                            responseCount = responseCount + 1;
                                            resSum = resSum + vote;
                                            if(vote > resMax) {
                                                resMax = vote;
                                            }
                                            if(vote < resMax) {
                                                resMin = vote;
                                            }
                                        }
                                    }
                                }
                                
                                if(responseCount) {
                                    // update responseCount
                                    updateDoc["$set"]["qs.$.resCount"] = responseCount;
                                    updateDoc["$set"]["qs.$.resAverage"] = resSum / responseCount;
                                    updateDoc["$set"]["qs.$.resSum"] = resSum;
                                    updateDoc["$set"]["qs.$.resMax"] = resMax;
                                    updateDoc["$set"]["qs.$.resMin"] = resMin;
                                    
                                    updatePoll(updateDoc);
                                }
                            });
                            
                        }
                    }
                }
            }
        });
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var countQuery = function(query) {
            query = filterQuery(query);
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
            return data;
        }
        var filterQuery = function(query) {
            // if(query.poll_id) {
            //     query.poll_id = new ObjectID(query.poll_id);
            // }
            // if(!query.hasOwnProperty('$or')) {
            //     query["$or"] = [];
            // }
            // if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            // } else if(req.session.data.user) {
            //     query["$or"].push({"user_id": req.session.data.user});
            // }
            // query["$or"].push({"session_id": req.session.data.id});
            return query;
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
            
            if(query.user_id) {
                query.user_id = new ObjectID(query.user_id);
            }
            if(query.session_id) {
                query.session_id = new ObjectID(query.session_id);
            }
            if(query.poll_id) {
                query.poll_id = new ObjectID(query.poll_id);
            }
            
            query = filterQuery(query);
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
                
                if(subPath && subPath.indexOf(qsPrefix) === 0) {
                    console.log(req.query)
                    if(req.query && req.query.id) {
                        query["qs.id"] = req.query.id;
                        // delete query.id;
                    }
                    query = filterQuery(query);
                    console.log(query)
                    ds.find(col, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                        } else if(data) {
                            data = filterData(data);
                            var doc = _.first(data);
                            if(doc && query["qs.id"]) {
                                res.data(_.where(doc.qs, {id: query["qs.id"]}));
                            } else {
                                if(doc && doc.qs) {
                                    res.data(doc.qs || []);
                                } else {
                                    res.data([]);
                                }
                            }
                        } else {
                            house.log.err(new Error('no data from mongo'));
                        }
                    });
                } else {
                    findQuery(query);
                }
                
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
            house.log.debug('POST | '+col);
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
                            if(newObj.hasOwnProperty('_id')) {
                                newObj.id = newObj._id;
                                delete newObj._id;
                            }
                            if(!newObj.hasOwnProperty('id')) {
                                var d = new Date();
                                newObj.id = d.getTime().toString();
                            }

                            ds.update(col, {
                                _id: docId
                            }, {
                                $push: {
                                    qs: newObj
                                }
                            }, function(err, data) {
                                res.data(newObj);
                                
                                // inc resCount for qs
                                incPollQsResCount(doc.poll_id, newObj.id, 1);
                                
                                // calc question results
                                
                                recalcPollQ(doc.poll_id, newObj.id);
                            });
                        }
                    }
                });
            } else {
                if(path == '') {
                    var newDoc = req.fields;
                    newDoc.at = new Date();
                    
                    newDoc.session_id = req.session.data.id;
                    if(req.session.data.user) {
                        newDoc.user_id = req.session.data.user;
                    }
                    
                    if(newDoc.poll_id) {
                        newDoc.poll_id = new ObjectID(newDoc.poll_id);
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
                                // emitToRoomIn(col, 'inserted', resWithDoc);
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
                                
                                // inc resCount for poll
                                incPollResCount(newDoc.poll_id, 1);
                            }
                        });
                    }
                    
                    insertNewDocAndRespond();
                }
            }
        } else if(req.method == 'PUT') {
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                if(req.session.data.user) {
                    query['user_id'] = req.session.data.user;
                } else {
                    query['session_id'] = req.session.data.id;
                }
            }
            
            if(docId) {
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
                                    var pollResQuestion;
                                    for(var q in resWithDoc.qs) {
                                        var qs = resWithDoc.qs[q];
                                        if(qs.id == qsPathId) {
                                            res.data(qs);
                                            pollResQuestion = qs;
                                        }
                                    }
                                    
                                    recalcPollQ(resWithDoc.poll_id, qsPathId);
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
                if(req.session.data.user) {
                    query['user_id'] = req.session.data.user;
                } else {
                    query['session_id'] = req.session.data.id;
                }
            }
            if(docId && subPath && subPath.indexOf(qsPrefix) === 0) {
                // pull out the given image
                var subIdStr = subPath.substr(qsPrefix.length+1);
                // var subId = new ObjectID(subIdStr);
                query._id = docId;
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
                    ds.remove(col, query, function(err, data){
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
