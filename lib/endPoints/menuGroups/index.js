//
// # MenuGroups Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    
    var ensureIndexes = function() {
        var collection = ds.db.collection(col);
        collection.ensureIndex({"slug": 1}, function(){
            house.log.debug('index ensured for menuGroups slug');
        });
    };
    ds.connected(function(){
        ensureIndexes();
    });
    
    var insertMainMenu = function(callback) {
        var mainMenu = {
            name: "Our Menu", 
            root: true
        };
        ds.insert(col, mainMenu, function(err, data){
            if(err) {
                house.log.err(err);
            } else {
                if(callback) {
                    callback([data]);
                }
            }
        });
    }
        
    ds.find(col, {root: true}, function(err, data){
        if(err) {
            house.log.err(err);
        } else if(data) {
            if(data.length === 0) {
                insertMainMenu(function(menuData){
                    house.log.debug('insert first menu as root');
                });
            }
        }
    });
    
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
        var groupPrefix = '/groups';
        var itemPrefix = '/items';
        
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
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(docId) {
                house.log.debug('subPath '+subPath);
                house.log.debug('subPath docId'+docId);
                if(subPath && subPath.indexOf(groupPrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'groups': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.data([]);
                        } else if(data) {
                            var doc = _.first(data);
                            var groups = _.first(data).groups || [];
                            res.data(groups);
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
                } else if(subPath && subPath.indexOf(itemPrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'items': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.data([]);
                        } else if(data) {
                            var doc = _.first(data);
                            var items = _.first(data).items || [];
                            res.data(items);
                        } else {
                            house.log.err(new Error('no data from mongo'));
                            res.data([]);
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
                if(subPath && subPath.indexOf(groupPrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'groups': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.setHeader('X-Count', 0);
                            res.data({});
                        } else if(data) {
                            var doc = _.first(data);
                            var groups = _.first(data).groups || [];
                            res.setHeader('X-Count', groups.length);
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
                } else if(subPath && subPath.indexOf(itemPrefix) === 0) {
                    if(req.query) {
                        query = req.query;
                    }
                    ds.find(col, {_id: docId, fields: {'items': true}}, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.setHeader('X-Count', 0);
                            res.data({});
                        } else if(data) {
                            var doc = _.first(data);
                            var items = _.first(data).items || [];
                            res.setHeader('X-Count', items.length);
                            res.data({});
                        } else {
                            house.log.err(new Error('no data from mongo'));
                            res.setHeader('X-Count', 0);
                            res.data({});
                        }
                    });
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
            
            if(subPath && subPath === '/groups') {
                // push in the new group
                var newG = req.fields;
                
                if(newG._id) {
                    newG.id = new ObjectID(newG._id);
                    delete newG._id;
                }
                
                ds.update(col, {_id: docId}, {$push: {groups: newG}}, function(err, data){
                    res.data(newG);
                });
            } else if(subPath && subPath === '/items') {
                // push in the new group
                var newItem = req.fields;
                
                if(newItem._id) {
                    newItem.id = new ObjectID(newItem._id);
                    delete newItem._id;
                }
                
                ds.update(col, {_id: docId}, {$push: {items: newItem}}, function(err, data){
                    res.data(newItem);
                });
            } else if(subPath && subPath === '/images') {
                // push in the new group
                var newImage = req.fields;
                
                if(newImage._id) {
                    newImage.id = new ObjectID(newImage._id);
                    delete newImage._id;
                }
                
                ds.update(col, {_id: docId}, {$push: {images: newImage}}, function(err, data){
                    res.data(newImage);
                });
            }
            
            if(path == '') {
                var newMenuGroup = req.fields;
                if(!newMenuGroup.hasOwnProperty('slug') && newMenuGroup.hasOwnProperty('name')) {
                    newMenuGroup.slug = house.utils.string.slugify(newMenuGroup.name);
                }
                ds.insert(col, newMenuGroup, function(err, data) {
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
            
                if(subPath && subPath.indexOf(groupPrefix) === 0) {
                    console.log('subPath of group prefix');
                    // pull out the given group
                    var subgroup = subPath.substr(groupPrefix.length+1);
                    console.log(subgroup);
                    var subGroupId = new ObjectID(subgroup);
                    
                    query['groups.id'] = subGroupId;
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['groups.$.'+i] = req.fields['$set'][i];
                            }
                        }
                    }
                    console.log(query);
                    console.log(updateDoc);
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
                } else if(subPath && subPath.indexOf(itemPrefix) === 0) {
                    console.log('subPath of item prefix');
                    // pull out the given group
                    var itemPathId = subPath.substr(itemPrefix.length+1);
                    console.log(itemPathId);
                    var groupItemId = new ObjectID(itemPathId);
                    
                    query['items.id'] = groupItemId;
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['items.$.'+i] = req.fields['$set'][i];
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
                } else if(subPath && subPath.indexOf(imagePrefix) === 0) {
                    console.log('subPath of image prefix');
                    // pull out the given group
                    var imagePathId = subPath.substr(imagePrefix.length+1);
                    console.log(imagePathId);
                    var groupImageId = new ObjectID(imagePathId);
                    
                    query['images.id'] = groupImageId;
                    var updateDoc = {};
                    
                    if(req.fields.hasOwnProperty('$set')) {
                        updateDoc = {"$set": {}};
                        for(var i in req.fields['$set']) {
                            if(i !== 'id') {
                                updateDoc['$set']['images.$.'+i] = req.fields['$set'][i];
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
                            if(req.fields.hasOwnProperty('$set')) {
                                if(req.fields['$set'].hasOwnProperty('name')) {
                                    // also update the name to group memberships
                                    
                                    updateQuery = {"groups.id": docId};
                                    updateDoc = {"$set": {"groups.$.name": req.fields['$set']['name']}};
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
            if(docId && subPath && subPath.indexOf(groupPrefix) === 0) {
                // pull out the given group
                var group = subPath.substr(groupPrefix.length+1);
                console.log(group);
                var groupId = new ObjectID(group);
                ds.update(col, {"_id": docId}, {"$pull": {"groups": {"id": groupId}}}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data({});
                });
                return;
            } else if(docId && subPath && subPath.indexOf(imagePrefix) === 0) {
                // pull out the given group
                var image = subPath.substr(imagePrefix.length+1);
                console.log(image);
                var imageId = new ObjectID(image);
                ds.update(col, {"_id": docId}, {"$pull": {"images": {"id": imageId}}}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data({});
                });
                return;
            } else if(docId && subPath && subPath.indexOf(itemPrefix) === 0) {
                // pull out the given group
                var item = subPath.substr(itemPrefix.length+1);
                console.log(item);
                var itemId = new ObjectID(item);
                ds.update(col, {"_id": docId}, {"$pull": {"items": {"id": itemId}}}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data({});
                });
                return;
            } else {
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
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
