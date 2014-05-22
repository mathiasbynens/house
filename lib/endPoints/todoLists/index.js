//
// # TODO Lists Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var tagsCol = options.collectionTags || 'tags';
    var todosCol = options.collectionTodos || 'todos';
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var countQuery = function(query) {
            if(query.hasOwnProperty('done')) {
                query.done = parseInt(query.done);
            }
            
            if(query.hasOwnProperty('list[id]')) {
                query['list.id'] = new ObjectID(query['list[id]']);
                delete query['list[id]'];
            }
            
            if(query.hasOwnProperty('list[$exists]')) {
                if(query['list[$exists]'] == 'false') {
                    query['list'] = {"$exists": false};
                    delete query['list[$exists]'];
                }
            }
            
            // query mongo id's
            if(query.hasOwnProperty('id')) {
                query._id = new ObjectID(query.id);
                delete query.id;
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
            
            if(query.hasOwnProperty('done')) {
                query.done = parseInt(query.done);
            }
            
            if(query.hasOwnProperty('list[id]')) {
                query['list.id'] = new ObjectID(query['list[id]']);
                delete query['list[id]'];
            }
            
            if(query.hasOwnProperty('list[$exists]')) {
                if(query['list[$exists]'] == 'false') {
                    query['list'] = {"$exists": false};
                    delete query['list[$exists]'];
                }
            }
            
            // query mongo id's
            if(query.hasOwnProperty('id')) {
                query._id = new ObjectID(query.id);
                delete query.id;
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
            house.log.debug('post');
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            if(path == '') {
                var newDoc = req.fields;
                if(newDoc.done) {
                  newDoc.done = parseInt(newDoc.done);
                }
                if(newDoc.rank) {
                  newDoc.rank = parseInt(newDoc.rank);
                }
                newDoc.owner = {id: req.session.data.user, name: req.session.data.name};
                ds.insert(col, newDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
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
                
                var doc = req.fields;
                var updateGroups = false;
                
                if(doc.hasOwnProperty('$set') && doc["$set"]["done"]) {
                  doc["$set"]["done"] = parseInt(doc["$set"]["done"]);
                  if(doc["$set"]["done"] === 1) {
                    doc["$set"]["doneOn"] = new Date();
                  }
                }
                if(doc.hasOwnProperty('$set') && doc["$set"]["rank"]) {
                  doc["$set"]["rank"] = parseInt(doc["$set"]["rank"]);
                }
                
                if(doc.hasOwnProperty('$set') && doc["$set"].hasOwnProperty('groups')) {
                  updateGroups = doc["$set"]["groups"];
                }
            
                ds.update(col, query, doc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        
                        var resWithFind = function() {
                            ds.find(col, query, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                } else if(data.length > 0) {
                                    res.data(_.first(data));
                                } else {
                                    res.data({});
                                }
                            });
                        }
                        
                        if(updateGroups) {
                            var todoGroupsQuery = {
                                "list.id": docId
                            }
                            var todoGroupsUpdateDoc = {
                                "$set": {
                                    groups: updateGroups
                                }
                            }
                            ds.update(todosCol, todoGroupsQuery, todoGroupsUpdateDoc, {multi:true}, function(err, data){
                                if(err) {
                                    house.log.err(err);
                                    res.end('error');
                                } else {
                                    house.log.debug(data);
                                    resWithFind();
                                }
                            });
                        } else {
                            resWithFind();
                        }
                        // res.data({});
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
                // query.owner = req.session.data.user;
                ds.remove(col, query, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                    }
                });
                
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
