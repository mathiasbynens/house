//
// # Authentication API Endpoint
//
var ObjectID = require('mongodb').ObjectID;
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
    
    var handleReq = function(req, res, next) {
        var path = req.url;
        
        var findUser = function(query) {
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
        var findUserId = function(id) {
            var query = {
                id: new ObjectID(id)
            }
            findUser(query);
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            //console.log(req.session.data.hasOwnProperty('user'))
            res.data(req.session.data);
            
        } else if(req.method == 'POST') {
            house.log.debug('post');
            console.log(path)
            console.log(req.fields)
            if(path == '') {
                
                if(req.fields.hasOwnProperty('name') && req.fields.hasOwnProperty('pass')) {
                    var name = req.fields.name;
                    var pass = hashPass(req.fields.pass);
                    
                    ds.find(col, {name: name, pass: pass}, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                            return;
                        }
                        if(data.length === 0) {
                            ds.find(col, {name: name}, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                    res.end('error');
                                } else if(data.length === 0) {
                                    ds.insert(col, {name: name, pass: pass}, function(err, data){
                                        if(err) {
                                            house.log.err(err);
                                            res.end('error');
                                        } else {
                                            console.log(data);
                                            var userData = data;
                                            if(_.isArray(data)) {
                                                userData = _(data).first();
                                            }
                                            req.authorizeUser(userData, function(){
                                                res.data(userData);
                                            });
                                        }
                                    });
                                } else {
                                    // incorrect password for user
                                    res.writeHead(403);
                                    res.end('{}');
                                }
                            });
                        } else {
                            var userData = data;
                            if(_.isArray(data)) {
                                userData = _(data).first();
                            }
                            req.authorizeUser(userData, function(){
                                res.data(userData);
                            });
                        }
                    });
                }
                
                
            }
        } else if(req.method == 'PUT') {
            
        } else if(req.method == 'DELETE') {
            req.destroySession(function(){
                res.data({});
            });
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});

