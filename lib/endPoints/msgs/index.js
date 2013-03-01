//
// # Messages Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
var email = require("emailjs/email");
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var usersCol = options.usersCollection || 'users';
    
    if(options.email) {
        var server = email.server.connect({
           user: options.email.user,
           password: options.email.pass,
           host: options.email.smtp,
           ssl: options.email.ssl
        });
    }
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var emitToRoomIn = function(col, verb, doc) {
            house.log.debug(col);
            house.log.debug(verb);
            var colVerb = verb+col.charAt(0).toUpperCase() + col.substr(1);
            if(_.isArray(doc)) {
                _.each(doc, function(doc) {
                    emitToRoomIn(col, verb, doc);
                });
                return;
            }
            if(verb == 'deleted') {
                house.io.rooms.in(col).emit(colVerb, doc);
                return;
            }
            var groups = doc.groups || [];
            if(groups.indexOf('public') !== -1) {
                house.io.rooms.in(col).emit(colVerb, doc);
            } else {
                var ioRoomManager = house.io.rooms.in(col).manager;
                for(var id in ioRoomManager.handshaken) {
                    var handshake = ioRoomManager.handshaken[id];
                    var idSocket = house.io.rooms.socket(id);
                    if(handshake.session.groups && handshake.session.groups.length > 0) {
                        if(handshake.session.groups.indexOf('admin') !== -1) {
                            house.log.debug('io msgs to admin');
                            idSocket.in(col).emit(colVerb, doc);
                        } else {
                           for(var g in groups) {
                               if(handshake.session.groups.indexOf(groups[g]) !== -1) {
                                   idSocket.in(col).emit(colVerb, doc);
                                   break;
                               }
                           }
                        }
                    }
                }
            }
        }
        
        var countQuery = function(query) {
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query["from.id"] = req.session.data.user;
            }
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    console.log(data);
                    res.setHeader('X-Count', data);
                    res.data({});
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var findQuery = function(query) {
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query["from.id"] = req.session.data.user;
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
            house.log.debug('post to msgs');
            if(path == '') {
                
                var newDoc = req.fields;
                newDoc.at = new Date();
                if(req.session.data.user) {
                    newDoc.from = {
                        id: req.session.data.user,
                        name: req.session.data.name
                    }
                }
                house.log.debug(req.session.data)
                //req.session.data.name req.session.data.host.name req.session.data.userAgent via req.session.data.referer at req.session.data.geo.city
                if(req.session.data.id) {
                    newDoc.s_id = req.session.data.id;
                }
                
                ds.insert(col, newDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        res.data(data);
                        emitToRoomIn(col, 'inserted', data);
                        
                        var msgslink = house.config.site.url + '/msgs/id/' + data.id;
                        var hostStr = '';
                        if(req.session.data.host) {
                            if(req.session.data.host.name) {
                                req.session.data.host.name+' - ';
                            } else {
                                req.session.data.host.ip+' - '
                            }
                        }
                        var txt = newDoc.txt + '\n\n\
----------\n\n\
sent from '+req.session.data.name+'\n\n ('+hostStr+req.session.data.userAgent+')';
                        if(req.session.data.referer) {
                            txt = txt + ' via '+req.session.data.referer;
                        }
                        if(req.session.data.geo) {
                            if(req.session.data.geo.city) {
                                txt = txt + ' at '+req.session.data.geo.city;
                            }
                            if(req.session.data.geo.state) {
                                txt = txt + ', '+req.session.data.geo.state;
                            }
                        }

                        var sendEmailOpts = {
                            text: txt,
                            from: '<'+options.email.user+'>',
                            to: '<'+options.email.user+'>',
                            subject: "msg",
                        }
                        
                        if(data.sub) {
                            sendEmailOpts.subject = data.sub;
                        }
                        
                        //attachment: [
                          //{data:"<html>i <i>hope</i> this works!</html>", alternative:true}
                          //,{path:"path/to/file.zip", type:"application/zip", name:"renamed.zip"}
                       //]
                       //text:    "i hope this works",
                       //from:    "you <username@gmail.com>",
                       //to:      "someone <someone@gmail.com>, another <another@gmail.com>",
                       //cc:      "else <else@gmail.com>",
                        
                        // email
                        if(server) {
                            server.send(sendEmailOpts, function(err, message) {
                                house.log.debug(err || message);
                            });
                        }
                    }
                });
            }
        } else if(req.method == 'PUT') {
            res.writeHead(403);
            res.end('{}');
            return;
            if(!req.session.data.user) {
            }
            var query = {};
            if(docId) {
                query._id = docId;
                query["from.id"] = req.session.data.user;
                if(req.fields.hasOwnProperty('$set')) {
                }
                
                ds.update(col, query, req.fields, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        res.data(data);
                        emitToRoomIn(col, 'updated', data);
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
                query['from.id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    ds.remove(col, query, function(err, data){
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            res.data(data);
                            emitToRoomIn(col, 'deleted', docId);
                        }
                    });
                });
            }
        } else if(req.method == 'OPTIONS') {
            
        }
    }
    return handleReq;
});
