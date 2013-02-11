//
// # Users Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
var crypto = require('crypto');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    
    var ds = options.ds;
    var col = options.collection;
    
    var hashPass = function(pass) {
        var passHash = crypto.createHash('sha512');
        passHash.update(pass);
        return passHash.digest('hex');
    }
    var slugStr = function(str) {
        str = str.toLowerCase().replace(/\s/g,'-');
        str = str.replace(/[^a-zA-Z0-9\-]/g,'');
        return str;
    }
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var filterData = function(data) {
            if(!_.isArray(data)) {
                if(data.hasOwnProperty('email')) {
                    delete data.email;
                }
            } else {
                _.each(data, function(doc, i){
                    if(doc.hasOwnProperty('email')) {
                        delete data[i].email;
                    }
                });
            }
            return data;
        }
        var countQuery = function(query) {
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
        }
        var findQuery = function(query) {
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    for(var i in data) {
                        delete data[i].pass;
                        
                        if(req.session.data.user && data[i].id.toString() == req.session.data.user.toString()
                        || (req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1)) {
                            //console.log('your own record')
                        } else {
                            data[i] = {
                                id: data[i].id,
                                name: data[i].name,
                                avatar: data[i].avatar
                            }
                        }
                    }
                    //data = filterData(data);
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
            
        } else if(req.method == 'PUT') {
            var countName = function(name, callback) {
                ds.count(col, {name: name}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        callback(data);
                    }
                });
            }
            var countEmail = function(name, callback) {
                ds.count(col, {name: name}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        callback(data);
                    }
                });
            }
            
            var query = {};
            if(docId) {
                query._id = docId;
                // must be a user
                if(!req.session.data.user) {
                    res.writeHead(403);
                    res.end('{}');
                    return;
                }
                if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                    
                } else {
                    query._id = req.session.data.user;
                }
                
                var updateDoc = req.fields;
                 
                var changeName = false;
                var changePass = false;
                
                if(updateDoc["$set"].hasOwnProperty('pass')) {
                    house.log.info('user is changing password');
                    
                    if(!updateDoc["$set"].hasOwnProperty('oldPass')) {
                        delete updateDoc["$set"].pass;
                    } else {
                        
                        var newPass = updateDoc["$set"].pass;
                        var oldPass = updateDoc["$set"].oldPass;
                        
                        //delete updateDoc["$set"].oldPass;
                        console.log(oldPass)
                        console.log(newPass)
                        
                        if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                        } else {
                            // use oldpass as query criteria in this update
                            query.pass = hashPass(oldPass);
                        }
                        updateDoc["$set"].pass = hashPass(newPass);
                        delete updateDoc["$set"].oldPass;
                    }
                }
                
                if(updateDoc["$set"].hasOwnProperty('name')) {
                    var desiredUserName = slugStr(updateDoc["$set"].name);
                    house.log.info('user changing name to '+desiredUserName);
                    
                    countName(desiredUserName, function(userCount){
                        if(userCount === 0) {
                            ds.update(col, query, {"$set": {name: desiredUserName}}, function(err, data){
                                ds.find(col, query, function(err, data){
                                    if(err) {
                                        house.log.err(err);
                                        res.data({});
                                    } else {
                                        if(data.length > 0) {
                                            house.log.debug(data);
                                            req.authorizeUser(_.first(data), function(){
                                                res.data(_.first(data));
                                            });
                                        }
                                    }
                                });
                            });
                        } else {
                            res.writeHead(403);
                            res.end('{}');
                        }
                    });
                    return;
                }
                
                if(updateDoc["$set"].hasOwnProperty('email')) {
                    house.log.info('user changing email to '+updateDoc["$set"].email);
                    
                    countName(updateDoc["$set"].email, function(userCount){
                        if(userCount === 0) {
                            ds.update(col, query, {"$set": {email: updateDoc["$set"].email}}, function(err, data){
                                res.data(data);
                            });
                        } else {
                            res.writeHead(403);
                            res.end('{}');
                        }
                    });
                    return;
                }
                
                if(updateDoc.hasOwnProperty('$set')) {
                    if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                    } else {
                        delete updateDoc["$set"].id;
                        delete updateDoc["$set"]._id;
                        delete updateDoc["$set"].at;
                        delete updateDoc["$set"].groups;
                        //delete updateDoc["$set"].name;
                        //delete updateDoc["$set"].pass;
                    }
                }
                
                ds.update(col, query, updateDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        ds.find(col, query, function(err, data){
                            if(err) {
                                house.log.err(err);
                                res.data({});
                            } else {
                                if(data.length > 0) {
                                    house.log.debug(data);
                                    res.data(_.first(data));
                                } else {
                                    house.log.info('invalid pass');
                                    res.writeHead(403);
                                    res.end('{msg: "password incorrect"}');
                                }
                            }
                        });
                    }
                });
            }
        } else if(req.method == 'DELETE') {
            var query = {};
            if(docId) {
                if(!req.session.data.user) {
                    res.writeHead(403);
                    res.end('{}');
                    return;
                }
                
                // you can only delete your own document
                query._id = req.session.data.user;
                
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
