//
// # TODO Lists Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
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
                
                newDoc.owner = req.session.data.user;
                
                if(newDoc.done) {
                  newDoc.done = parseInt(newDoc.done);
                }
                if(newDoc.rank) {
                  newDoc.rank = parseInt(newDoc.rank);
                }
                
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
                
                var document = req.fields;
                
                if(document.hasOwnProperty('$set') && document["$set"]["done"]) {
                  document["$set"]["done"] = parseInt(document["$set"]["done"]);
                  if(document["$set"]["done"] === 1) {
                    document["$set"]["doneOn"] = new Date();
                  }
                }
                if(document.hasOwnProperty('$set') && document["$set"]["rank"]) {
                  document["$set"]["rank"] = parseInt(document["$set"]["rank"]);
                }
            
                ds.update(col, query, document, function(err, data){
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
