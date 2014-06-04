//
// # Messages Collection API Endpoint
//
var ObjectID = mongo.ObjectID;
var spawn = require('child_process').spawn;
var email = require("emailjs-plus/email");
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var usersCol = options.usersCollection || 'users';
    
    if(options.email) {
        var emailOpts = {
            user: house.config.email.user,
            password: house.config.email.pass,
            host: house.config.email.smtp,
        };
        if(house.config.email.hasOwnProperty('ssl') && house.config.email.ssl) {
            emailOpts.ssl = house.config.email.ssl;
        }
        if(house.config.email.hasOwnProperty('tls')) {
            emailOpts.tls = house.config.email.tls;
        }
        if(house.config.email.hasOwnProperty('domain')) {
            emailOpts.domain = house.config.email.domain;
        }
        if(house.config.email.port) {
            emailOpts.port = house.config.email.port;
        }
        // console.log(emailOpts)
        var emailServer = email.server.connect(emailOpts);
    }
    
    var phantomGUrl = function(url, user, pass, callback) {
        var html = ''
        , title = ''
        , desc = '';
        var fullPath = '/tmp/'+encodeURIComponent(url)+'.png';
        var screenRes = '1024x768x24'; // 640x480x24
        //var phantomjs = spawn('xvfb-run', ['-as', '-screen 0 '+screenRes, 'phantomjs', __dirname+'/phantom.js', url, fullPath]);
        var phantomjs = spawn('phantomjs', [__dirname+'/phantom-g.js', url, fullPath, user, pass]);
        phantomjs.stdout.on('data', function (data) {
          house.log.debug('phantomjs.stdout: ' + data);
          html += data.toString();
        });
          
        phantomjs.stderr.on('data', function (data) {
            console.log('!phantomjs stderr: ' + data);
        });
          
        phantomjs.on('exit', function (code) {
          house.log.debug('phantomjs process exited with code ' + code);
          if(callback) {
              callback(fullPath);
          }
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
            try {
                docId = new ObjectID(docId);
            } catch(e) {
                docId = null;
            }
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(path === '/gl') {
                if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                    if(options.email.user && options.email.pass) {
                        phantomGUrl('https://mail.google.com/mail/',  options.email.user, options.email.pass, function(filePath){
                            house.log.debug('gl - phantomjs process exited - ');
                            console.log(filePath)
                            
                            var stat = fs.statSync(filePath);
                        
                            res.writeHead(200, {
                                'Content-Type': 'image/png',
                                'Content-Length': stat.size
                            });
                            var readStream = fs.createReadStream(filePath);
                            readStream.pipe(res);
                        });
                    }
                }
                return;
            }
            
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
                if(!query.hasOwnProperty('limit')) {
                    query.limit = 25;
                }
                if(query.limit > 250) {
                    query.limit = 250;
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
                //house.log.debug(req.session.data)
                //req.session.data.name req.session.data.host.name req.session.data.userAgent via req.session.data.referer at req.session.data.geo.city
                if(req.session.data.id) {
                    newDoc.s_id = req.session.data.id;
                }
                
                if(newDoc.hasOwnProperty('to')) {
                    //house.log.debug(newDoc.to)
                    if(newDoc.to.id) {
                        if(typeof newDoc.to.id === 'string') {
                            newDoc.to.id = new ObjectID(newDoc.to.id);
                        }
                    }
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
sent from '+req.session.data.name+'\n\n '+hostStr+req.session.data.userAgent+'';
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
                            from: '<'+house.config.email.user+'>',
                            to: '<'+options.email.user+'>',
                            subject: "msg",
                        }
                        
                        if(house.config.hasOwnProperty('site') && house.config.site.hasOwnProperty('owner') && house.config.site.owner.hasOwnProperty('email')) {
                            sendEmailOpts.to = '<'+house.config.site.owner.email+'>';
                        }
                        if(house.config.msgs && house.config.msgs.to) {
                            sendEmailOpts.to = '<'+house.config.msgs.to+'>';
                        }
                        
                        if(data.sub) {
                            sendEmailOpts.subject = data.sub;
                        }
                        
                        // attach image as html
                        if(newDoc.screenshotImg) {
                            // sendEmailOpts.html = sendEmailOpts.text + '\n\n<br><br>'+ newDoc.screenshotImg;
                            var baseStr = ';base64,'
                            var encodedImgSrt = newDoc.screenshotImg.substr(newDoc.screenshotImg.indexOf(baseStr)+baseStr.length);
                            encodedImgSrt = encodedImgSrt.substr(0, encodedImgSrt.indexOf('"'));
                            // console.log(encodedImgSrt)
                            sendEmailOpts.attachment = {
                                data:'<html>'+sendEmailOpts.text + '\n\n<br><br><img style="border: 2px solid grey;" src="cid:screenshot@local"></html>',
                                // encoded: true,
                                // inline: true,
                                type: 'text/html',
                                alternative:true,
                                related: 
                                [
                                   {
                                    //   path:    path.join(__dirname, "attachments/smtp.gif"),
                                      data: encodedImgSrt,
                                      encoded: true,
                                      type:    "image/png", 
                                      name:    "screenshot.png", 
                                      headers: {"Content-ID":"<screenshot@local>"}
                                   }
                                ]
                            };
                        }
                        console.log(sendEmailOpts)
                        var findUserById = function(user_id, callback) {
                            ds.find('users', {_id: user_id}, function(err, data) {
                                if(err) {
                                    callback(err);
                                } else if(data.length > 0) {
                                    var doc = _.first(data);
                                    callback(null, doc);
                                } else {
                                    callback(new Error("No documents found."));
                                }
                            });
                        }
                        
                        var notifyEmail = function(callback) {
                            // email
                            //console.log('sendEmailOpts')
                            //console.log(sendEmailOpts)
                            if(emailServer) {
                                emailServer.send(sendEmailOpts, function(err, message) {
                                    // house.log.debug(err || message);
                                    if(err) {
                                        house.log.err(err);
                                    } else {
                                        house.log.debug('email sent!');
                                    }
                                    if(callback) {
                                        callback();
                                    }
                                });
                            }
                        }
                        if(data.to) {
                            sendEmailOpts.text = newDoc.txt + '\n\n\
----------\n\n\
sent from '+req.session.data.name;
                            
                            findUserById(data.to.id, function(err, userDoc){
                                if(err) {
                                    callback(err);
                                } else if(userDoc && userDoc.email) {
                                    var displayName = userDoc.name;
                                    if(userDoc.displayName) {
                                        displayName = userDoc.displayName;
                                    }
                                    sendEmailOpts.to = displayName+' <'+userDoc.email+'>';
                                    notifyEmail();
                                } else {
                                    //callback(new Error("No documents found."));
                                    notifyEmail();
                                }
                            });
                        } else {
                            notifyEmail();
                        }
                        
                        //attachment: [
                          //{data:"<html>i <i>hope</i> this works!</html>", alternative:true}
                          //,{path:"path/to/file.zip", type:"application/zip", name:"renamed.zip"}
                       //]
                       //text:    "i hope this works",
                       //from:    "you <username@gmail.com>",
                       //to:      "someone <someone@gmail.com>, another <another@gmail.com>",
                       //cc:      "else <else@gmail.com>",
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
