//
// # Orders Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    var ds = options.ds;
    var col = options.collection;
    var colItems = options.collectionMenuItems;
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var parseQuery = function(query) {
            console.log('parse query:');
            console.log(query);
            
            for(var i in query) {
                var xi = i.indexOf('[$exists]');
                if(xi !== -1) {
                    var v = query[i];
                    if(v === 'false') v = false;
                    query[i.substr(0,xi)] = {"$exists": v};
                    delete query[i];
                }
            }
            
            if(query.status) {
                query.status = parseInt(query.status);
            }
            
            console.log(query);
            return query;
        }
        var countQuery = function(query) {
            //query["owner.id"] = req.session.data.user;
            query = parseQuery(query);
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.setHeader('X-Count', data);
                    res.data({});
                } else {
                    house.log.err(new Error('no data from mongo'));
                    res.setHeader('X-Count', 0);
                    res.data({});
                }
            });
        }
        var findQuery = function(query) {
            query = parseQuery(query);
            
            if(req.session.data.user) {
                query["$or"] = [
                    {session_id : req.session.data.id}, 
                    {"user.id": req.session.data.user}
                ];
            } else {
                query.session_id = req.session.data.id;
            }
            
            
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
        var subPath = false;
        var itemSkusStr = 'itemSkus';
        var itemSkusPrefix = '/'+itemSkusStr;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            var subSlashI = docId.indexOf('/');
            
            if(subSlashI !== -1) {
                docId = docId.substr(0, subSlashI);
                docId = new ObjectID(docId);
                
                subPath = path.substr(subSlashI+1);
            } else {
                docId = new ObjectID(docId);
            }
            console.log('subPath')
            console.log(subPath)
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
                house.log.debug('subPath '+subPath);
                house.log.debug('subPath docId '+docId);
                if(subPath && subPath.indexOf(itemSkusPrefix) === 0) {
                    // if(req.query) {
                    //     query = req.query;
                    // }
                    // ds.find(col, {_id: docId, fields: {'skus': true}}, function(err, data){
                    //     if(err) {
                    //         house.log.err(err);
                    //         res.setHeader('X-Count', 0);
                    //         res.data({});
                    //     } else if(data) {
                    //         var doc = _.first(data);
                    //         var skus = _.first(data).skus || [];
                    //         res.setHeader('X-Count', skus.length);
                    //         res.data({});
                    //     } else {
                    //         house.log.err(new Error('no data from mongo'));
                    //         res.setHeader('X-Count', 0);
                    //         res.data({});
                    //     }
                    // });
                } else {
                    query._id = docId;
                    countQuery(query);
                }
            } else {
                if(req.query) {
                    query = req.query;
                }
                countQuery(query);
            }
        } else if(req.method == 'POST') {
            house.log.debug('post');
            console.log(path)
            console.log(req.fields)
            
            if(subPath && subPath === itemSkusPrefix) {
                var newItemSku = req.fields;
                if(newItemSku.hasOwnProperty('item_id')) {
                    newItemSku.item_id = new ObjectID(newItemSku.item_id);
                }
                
                if(newItemSku._id) {
                    newItemSku.id = new ObjectID(newItemSku._id);
                    delete newItemSku._id;
                } else if(newItemSku.id) {
                    newItemSku.id = new ObjectID(newItemSku.id);
                } else {
                    newItemSku.id = new ObjectID();
                }
                
                if(newItemSku.sku) {
                    if(newItemSku.sku.id) {
                        newItemSku.sku.id = newItemSku.sku.id;
                    }
                }
                if(newItemSku.item) {
                    if(newItemSku.item.id) {
                        newItemSku.item.id = new ObjectID(newItemSku.item.id);
                    }
                }
                
                ds.update(col, {_id: docId}, {$push: {itemSkus: newItemSku}}, function(err, data){
                    res.data(newItemSku);
                });
            } else {
                var newDoc = req.fields;
                newDoc.at = new Date();
                
                if(req.session.data.user) {
                    newDoc.user = {
                        id: req.session.data.user,
                        name: req.session.data.name
                    }
                }
                
                console.log(req.session);
                newDoc["session_id"] = req.session.data.id;
                
                if(path == '') {
                    ds.insert(col, newDoc, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                        }
                    });
                }
            }
        } else if(req.method == 'PUT') {
            var query = {};
            if(docId) {
                query._id = docId;
                
                if(req.session.data.user) {
                    query["user.id"] = req.session.data.user;
                } else {
                    query.session_id = req.session.data.id;
                }
            
                if(subPath && subPath.indexOf(itemSkusPrefix) === 0) {
                    console.log('subPath of itemSkus prefix');
                    // pull out the given image
                    var pathId = subPath.substr(itemSkusPrefix.length+1);
                    console.log(pathId);
                    query['itemSkus.id'] = new ObjectID(pathId);
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['itemSkus.$.'+i] = req.fields['$set'][i];
                            }
                        }
                    } else if(req.fields.hasOwnProperty('$unset')) {
                        updateDoc = {"$unset": {}};
                        for(var i in req.fields['$unset']) {
                            if(i !== 'id') {
                                updateDoc['$unset']['itemSkus.$.'+i] = req.fields['$unset'][i];
                            }
                        }
                    }
                    if(updateDoc == {}) return;
                    ds.update(col, query, updateDoc, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.log.debug(data);
                            res.data(data);
                        }
                    });
                } else {
                    ds.update(col, query, req.fields, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            house.log.debug(data);
                            res.data({});
                        }
                    });
                }
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(req.session.data.user) {
                query["user.id"] = req.session.data.user;
            } else {
                query.session_id = req.session.data.id;
            }
            if(docId && subPath && subPath.indexOf(itemSkusPrefix) === 0) {
                console.log('pull out itemsku');
                // pull out the given image
                var pathSku = '';
                var pathItemId = subPath.substr(itemSkusPrefix.length+1);
                console.log(pathItemId);
                var pathItemIdi = pathItemId.indexOf('/');
                if(pathItemIdi !== -1) {
                    console.log(pathItemIdi)
                    console.log(pathItemId)
                    console.log(pathItemId);
                    pathSku = pathItemId.substr(pathItemIdi+1);
                    pathItemId = pathItemId.substr(0,pathItemIdi);
                    console.log(pathSku);
                }
                var itemId = new ObjectID(pathItemId);
                var updoc = {"$pull": {}};
                updoc["$pull"][itemSkusStr] = {
                    id: itemId
                }
                if(pathSku !== '') {
                    updoc["$pull"][itemSkusStr]['id'] = pathSku;
                }
                console.log(updoc);
                ds.update(col, {"_id": docId}, updoc, function(err, data){
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
