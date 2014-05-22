//
// # MenuItems Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var colReviews = options.collectionReviews || 'menuItemReviews';
    
    var ensureIndexes = function() {
        var collection = ds.db.collection(col);
        collection.ensureIndex({"slug": 1}, function(){
            house.log.debug('index ensured for menuItems slug');
        });
    };
    
    if(!house.config.forkedFeedFetcher) {
        ds.connected(function(){
            ensureIndexes();
        });
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var countQuery = function(query) {
            //query["owner.id"] = req.session.data.user;
            if(query.name && query.name.indexOf('/') === 0) {
                var opts = query.name.substr(query.name.lastIndexOf('/')+1);
                query.name = new RegExp(query.name.substr(1, query.name.lastIndexOf('/')-1), opts);
            }
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
            if(query.name && query.name.indexOf('/') === 0) {
                var opts = query.name.substr(query.name.lastIndexOf('/')+1);
                query.name = new RegExp(query.name.substr(1, query.name.lastIndexOf('/')-1), opts);
            }
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                    res.data([]);
                }
            });
        }
        
        var docId;
        var subPath = false;
        var imagePrefix = '/images';
        var skuPrefix = '/skus';
        var reviewsStr = 'reviews';
        var reviewPrefix = '/'+reviewsStr;
        
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
                house.log.debug('subPath '+subPath);
                house.log.debug('subPath docId '+docId);
                if(subPath && subPath.indexOf(skuPrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'skus': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.data([]);
                        } else if(data) {
                            var doc = _.first(data);
                            var skus = _.first(data).skus || [];
                            res.data(skus);
                        } else {
                            house.log.err(new Error('no data from mongo'));
                            res.data([]);
                        }
                    });
                } else if(subPath && subPath.indexOf(imagePrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'images': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.data([]);
                        } else if(data) {
                            var doc = _.first(data);
                            var images = _.first(data).images || [];
                            res.data(images);
                        } else {
                            house.log.err(new Error('no data from mongo'));
                            res.data([]);
                        }
                    });
                } else if(subPath && subPath === reviewPrefix) {
                    query.menu_item_id = docId;
                    ds.find(colReviews, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                        } else if(data) {
                            res.data(data);
                        } else {
                            house.log.err(new Error('no data from mongo'));
                        }
                    });
                } else {
                    query._id = docId;
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
                house.log.debug('subPath '+subPath);
                house.log.debug('subPath docId '+docId);
                if(subPath && subPath.indexOf(skuPrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'skus': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.setHeader('X-Count', 0);
                            res.data({});
                        } else if(data) {
                            var doc = _.first(data);
                            var skus = _.first(data).skus || [];
                            res.setHeader('X-Count', skus.length);
                            res.data({});
                        } else {
                            house.log.err(new Error('no data from mongo'));
                            res.setHeader('X-Count', 0);
                            res.data({});
                        }
                    });
                } else if(subPath && subPath.indexOf(imagePrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'images': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.setHeader('X-Count', 0);
                            res.data({});
                        } else if(data) {
                            var doc = _.first(data);
                            var images = _.first(data).images || [];
                            res.setHeader('X-Count', images.length);
                            res.data({});
                        } else {
                            house.log.err(new Error('no data from mongo'));
                            res.setHeader('X-Count', 0);
                            res.data({});
                        }
                    });
                } else if(subPath && subPath.indexOf(reviewPrefix) === 0) {
                    //
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
            console.log(subPath)
            console.log(req.fields)
            
            if(subPath && subPath === imagePrefix) {
                var newImage = req.fields;
                
                if(newImage._id) {
                    newImage.id = new ObjectID(newImage._id);
                    delete newImage._id;
                }
                
                ds.update(col, {_id: docId}, {$push: {images: newImage}}, function(err, data){
                    res.data(newImage);
                });
            } else if(subPath && subPath === skuPrefix) {
                var newObject = req.fields;
                
                if(newObject._id) {
                    // newObject.id = new ObjectID(newObject._id);
                    newObject.id = newObject._id; // string
                    delete newObject._id;
                }
                
                ds.update(col, {_id: docId}, {$push: {skus: newObject}}, function(err, data){
                    res.data(newObject);
                });
            } else if(subPath && subPath === reviewPrefix) {
                var newObject = req.fields;
                console.log(newObject)
                
                newObject.menu_item_id = docId;
                newObject.at = new Date();
                console.log(req.session.data);
                newObject.user = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                
                if(req.session.data.avatar) {
                    newObject.user.avatar = req.session.data.avatar;
                }
                
                if(req.session.data.hasOwnProperty('avatar')) {
                    newObject.user.avatar = req.session.data.avatar;
                }
                if(newObject.hasOwnProperty('image')) {
                    newObject.image.id = new ObjectID(newObject.image.id);
                }
                ds.insert(colReviews, newObject, function(err, data){
                    res.data(data);
                });
            }
            
            if(path == '') {
                ds.insert(col, req.fields, function(err, data){
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
                console.log(req.fields);
                delete(req.fields._id);
                delete(req.fields.id);
            
                if(subPath && subPath.indexOf(imagePrefix) === 0) {
                    console.log('subPath of image prefix');
                    // pull out the given image
                    var imagePathId = subPath.substr(imagePrefix.length+1);
                    console.log(imagePathId);
                    var itemImageId = new ObjectID(imagePathId);
                    
                    query['images.id'] = itemImageId;
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['images.$.'+i] = req.fields['$set'][i];
                            }
                        }
                    } else if(req.fields.hasOwnProperty('$unset')) {
                        updateDoc = {"$unset": {}};
                        for(var i in req.fields['$unset']) {
                            if(i !== 'id') {
                                updateDoc['$unset']['images.$.'+i] = req.fields['$unset'][i];
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
                } else if(subPath && subPath.indexOf(skuPrefix) === 0) {
                    console.log('subPath of sku prefix');
                    var pathId = subPath.substr(skuPrefix.length+1);
                    query['skus.id'] = pathId;
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['skus.$.'+i] = req.fields['$set'][i];
                            }
                        }
                    } else if(req.fields.hasOwnProperty('$unset')) {
                        updateDoc = {"$unset": {}};
                        for(var i in req.fields['$unset']) {
                            if(i !== 'id') {
                                updateDoc['$unset']['skus.$.'+i] = req.fields['$unset'][i];
                            }
                        }
                    }
                    if(_.size(updateDoc) === 0) return;
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
                    
                    var updateObj = req.fields;
                    
                    if(updateObj.hasOwnProperty('$set')) {
                        if(updateObj['$set'].hasOwnProperty('reward') && updateObj['$set']['reward'].hasOwnProperty('id')) {
                            updateObj['$set']['reward']['id'] = new ObjectID(updateObj['$set']['reward']['id']);
                        }
                    }
                    
                    ds.update(col, query, updateObj, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            if(req.fields.hasOwnProperty('$set')) {
                                if(req.fields['$set'].hasOwnProperty('title')) {
                                    // also update the title to group memberships
                                    house.log.debug(data);
                                    res.data({});
                                    //TODO
                                    return;
                                    updateQuery = {"items.id": docId};
                                    updateDoc = {"$set": {"items.$.title": req.fields['$set']['title']}};
                                    ds.update(col, updateQuery, updateDoc, function(err, data){
                                        if(err) {
                                            house.log.err(err);
                                            res.end('error');
                                        } else {
                                            house.log.debug(data);
                                        }
                                    });
                                }
                            }
                            house.log.debug(data);
                            res.data({});
                        }
                    });
                }
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            console.log(docId);
            if(docId && subPath && subPath.indexOf(imagePrefix) === 0) {
                // pull out the given image
                var image = subPath.substr(imagePrefix.length+1);
                console.log(image);
                var imageId = new ObjectID(image);
                ds.update(col, {"_id": docId}, {"$pull": {"images": {"id": imageId}}}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data(data);
                });
                return;
            } else if(docId && subPath && subPath.indexOf(skuPrefix) === 0) {
                var skuid = subPath.substr(skuPrefix.length+1);
                ds.update(col, {"_id": docId}, {"$pull": {"skus": {"id": skuid}}}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data(data);
                });
                return;
            } else if(docId && subPath && subPath.indexOf(reviewPrefix) === 0) {
                var reviewid = new ObjectID(subPath.substr(reviewPrefix.length+1));
                console.log(reviewid);
                ds.remove(colReviews, {"_id": reviewid}, function(err, data){
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
        }
    }
    return handleReq;
});
