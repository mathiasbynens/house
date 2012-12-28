//
// # TODOs API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var feedEndPoint = house.api.getEndPointByName("feed");
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {"col": "todos", "id": doc.id},
                "todo": doc,
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
                    "todo": doc,
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
                var feedQuery = {"ref": {"col": "todos", "id": doc.id}};
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
        
        var findQuery = function(query) {
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
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
                    
                    query.owner = req.session.data.user;
                    
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
                }
                findQuery(query);
            }
            
        } else if(req.method == 'POST') {
            house.log.debug('post');
            if(path == '') {
                
                var newDoc = req.fields;
                
                if(newDoc.hasOwnProperty('list') && newDoc.list.id) {
                    newDoc.list.id = new ObjectID(newDoc.list.id);
                }
                
                if(newDoc.done) {
                    newDoc.done = parseInt(newDoc.done);
                }
                if(newDoc.rank) {
                    newDoc.rank = parseInt(newDoc.rank);
                }
                  
                // can only insert to your own ownership
                newDoc.owner = req.session.data.user;
                
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
            var query = {};
            if(docId) {
                query._id = docId;
                query.owner = req.session.data.user;
            
                var updateDoc = req.fields;
            
                if(updateDoc.hasOwnProperty('$set') && updateDoc["$set"]["done"]) {
                  updateDoc["$set"]["done"] = parseInt(updateDoc["$set"]["done"]);
                  if(updateDoc["$set"]["done"] === 1) {
                    updateDoc["$set"]["doneOn"] = new Date();
                    
                    // TODO if the todo was part of a list, indrement that lists doneCount
                    
                  } else {
                    updateDoc["$unset"]["doneOn"] = true;
                  }
                }
                if(updateDoc.hasOwnProperty('$set') && updateDoc["$set"]["rank"]) {
                  updateDoc["$set"]["rank"] = parseInt(updateDoc["$set"]["rank"]);
                }
            
                ds.update(col, query, updateDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        res.data({});
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(docId) {
                query._id = docId;
                query.owner = req.session.data.user;
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
