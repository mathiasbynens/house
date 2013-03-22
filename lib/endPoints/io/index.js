//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;
var useragent = require('useragent');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var colRooms = options.roomsCollection;
    var colMsgs = options.messagesCollection;
    
    var roomUsers = {};
    if(!house.io) {
        house.log.debug('house io not loaded');
        return function(req,res,next){
            next();
        };
    }
    house.io.rooms = house.io.of('/socket.io/io');
    house.io.rooms.authorization(function (data, accept) {
        accept(null, true);
    });
    house.io.sockets.on('connection', function(socket) {
        socket.on('disconnect', function() {
            house.io.rooms.in('io').emit('deletedIo', socket.id);
        });
    });
    house.io.rooms.on('connection', function (socket) {
        house.log.debug('user connected to io '+socket.id);
        //console.log(socket);
        var leaveRoomSessionId = function(roomId) {
            house.log.info('leaveRoomSessionId '+socket.id);
            house.io.rooms.in('io').emit('deletedIo', socket.id);
            if(roomId) {
                socket.leave(roomId);
            }
            //updateRoomUserCount(roomId);
        }
        socket.on('disconnect', function() {
            leaveRoomSessionId();
            house.log.info('user disconnect');
        });
        socket.on('leave', function(roomId) {
            house.log.info('user left room '+roomId);
            leaveRoomSessionId(roomId);
        });
        socket.on('join', function(roomId) {
            socket.on('disconnect', function() {
                leaveRoomSessionId();
            });
            socket.join(roomId);
            house.log.info('join to io room '+roomId);
            var ioo = socket.handshake;
            ioo.id = socket.id;
            ioo.rooms = house.io.roomClients[socket.id];
            if(socket.handshake.headers["user-agent"]) {
                var ag = useragent.lookup(socket.handshake.headers["user-agent"]);
                try {
                    ioo.agent = ag.toJSON();
                } catch (e) {
                    house.log.err(e);
                }
            }
            house.io.rooms.in('io').emit('insertedIo', ioo);
        });
    });
    
    if(house.ioi) {
        house.ioi.rooms = house.ioi.of('/socket.io/io');
        house.ioi.rooms.authorization(function (data, accept) {
            accept(null, true);
        });
        house.ioi.sockets.on('connection', function(socket) {
            socket.on('disconnect', function() {
                house.io.rooms.in('io').emit('deletedIo', socket.id);
                house.ioi.rooms.in('io').emit('deletedIo', socket.id);
            });
        });
        house.ioi.rooms.on('connection', function (socket) {
            house.log.debug('user connected to io '+socket.id);
            //console.log(socket);
            var leaveRoomSessionId = function(roomId) {
                house.log.info('leaveRoomSessionId '+socket.id);
                house.io.rooms.in('io').emit('deletedIo', socket.id);
                house.ioi.rooms.in('io').emit('deletedIo', socket.id);
                if(roomId) {
                    socket.leave(roomId);
                }
                //updateRoomUserCount(roomId);
            }
            socket.on('disconnect', function() {
                leaveRoomSessionId();
                house.log.info('user disconnect');
            });
            socket.on('leave', function(roomId) {
                house.log.info('user left room '+roomId);
                leaveRoomSessionId(roomId);
            });
            socket.on('join', function(roomId) {
                socket.on('disconnect', function() {
                    leaveRoomSessionId();
                });
                socket.join(roomId);
                house.log.info('join to io room '+roomId);
                var ioo = socket.handshake;
                ioo.id = socket.id;
                ioo.rooms = house.ioi.roomClients[socket.id];
                if(socket.handshake.headers["user-agent"]) {
                    var ag = useragent.lookup(socket.handshake.headers["user-agent"]);
                    try {
                        ioo.agent = ag.toJSON();
                    } catch (e) {
                        house.log.err(e);
                    }
                }
                house.io.rooms.in('io').emit('insertedIo', ioo);
                house.ioi.rooms.in('io').emit('insertedIo', ioo);
            });
        });
    }
    house.io.emitToRoomDocOwnerId = function(col, verb, doc, secureOnly) {
        if(!doc.owner) {
            return;
        }
        var colVerb = verb+col.charAt(0).toUpperCase() + col.substr(1);
        if(_.isArray(doc)) {
            _.each(doc, function(doc) {
                house.io.emitToRoomDocOwnerId(col, verb, doc, secureOnly);
            });
            return;
        }
        if(verb == 'deleted') {
            house.io.rooms.in(col).emit(colVerb, doc);
            return;
        }
        var ioRoomManager = house.io.rooms.in(col).manager;
        for(var id in ioRoomManager.handshaken) {
            var handshake = ioRoomManager.handshaken[id];
            var idSocket = house.io.rooms.socket(id);
            if(handshake.session.user && doc.owner.id) {
                if(doc.owner.id.toString() == handshake.session.user.toString()) {
                    idSocket.in(col).emit(colVerb, doc);
                }
            }
        }
        if(house.ioi && !secureOnly) {
            if(verb == 'deleted') {
                house.ioi.rooms.in(col).emit(colVerb, doc);
                return;
            }
            var ioRoomManager = house.ioi.rooms.in(col).manager;
            for(var id in ioRoomManager.handshaken) {
                var handshake = ioRoomManager.handshaken[id];
                var idSocket = house.ioi.rooms.socket(id);
                if(handshake.session.user && doc.owner.id) {
                    if(doc.owner.id.toString() == handshake.session.user.toString()) {
                        idSocket.in(col).emit(colVerb, doc);
                    }
                }
            }
        }
    }
    house.io.emitToRoomDocUserId = function(col, verb, doc, secureOnly) {
        var colVerb = verb+col.charAt(0).toUpperCase() + col.substr(1);
        if(_.isArray(doc)) {
            _.each(doc, function(doc) {
                house.io.emitToRoomDocUserId(col, verb, doc, secureOnly);
            });
            return;
        }
        if(verb == 'deleted') {
            house.io.rooms.in(col).emit(colVerb, doc);
            return;
        }
        var ioRoomManager = house.io.rooms.in(col).manager;
        for(var id in ioRoomManager.handshaken) {
            var handshake = ioRoomManager.handshaken[id];
            var idSocket = house.io.rooms.socket(id);
            if(handshake.session.user && doc.user_id) {
                if(doc.user_id.toString() == handshake.session.user.toString()) {
                    idSocket.in(col).emit(colVerb, doc);
                }
            }
        }
        if(house.ioi && !secureOnly) {
            if(verb == 'deleted') {
                house.ioi.rooms.in(col).emit(colVerb, doc);
                return;
            }
            var ioRoomManager = house.ioi.rooms.in(col).manager;
            for(var id in ioRoomManager.handshaken) {
                var handshake = ioRoomManager.handshaken[id];
                var idSocket = house.ioi.rooms.socket(id);
                if(handshake.session.user && doc.user_id) {
                    if(doc.user_id.toString() == handshake.session.user.toString()) {
                        idSocket.in(col).emit(colVerb, doc);
                    }
                }
            }
        }
    }
    
    var handleReq = function(req, res, next) {
        if(req.session.data.user && req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
        } else {
            res.writeHead(403);
            res.end('{}');
            return;
        }
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        var docId;
        var postfix;
        
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            var docii = docId.indexOf('/');
            if(docii !== -1) {
                postfix = docId.substr(docii+1);
                docId = docId.substr(0, docii);
            }
            docId = new ObjectID(docId);
        }
        if(req.method == 'GET') {
            //console.log(house.io.handshaken);
            var o = [];
            for(var i in house.io.handshaken) {
                //console.log(i);
                var hand = house.io.handshaken[i];
                hand.id = i;
                hand.rooms = house.io.roomClients[i];
                
                if(hand.headers["user-agent"]) {
                    var ag = useragent.lookup(hand.headers["user-agent"]);
                    try {
                        hand.agent = _.clone(ag.toJSON());
                    } catch (e) {
                        house.log.debug(ag.toJSON());
                        house.log.err(e);
                    }
                }
                o.push(hand);
            }
            if(house.ioi) {
                for(var i in house.ioi.handshaken) {
                    //console.log(i);
                    var hand = house.ioi.handshaken[i];
                    hand.id = i;
                    hand.rooms = house.ioi.roomClients[i];
                    
                    if(hand.headers["user-agent"]) {
                        var ag = useragent.lookup(hand.headers["user-agent"]);
                        try {
                            hand.agent = _.clone(ag.toJSON());
                        } catch (e) {
                            house.log.debug(ag.toJSON());
                            house.log.err(e);
                        }
                    }
                    o.push(hand);
                }
            }
            res.data(o);
        
        } else if(req.method == 'HEAD') {
            var count = house.io.handshaken.length;
            if(house.ioi) {
                count = count + house.ioi.handshaken.length;
            }
            res.setHeader('X-Count', count);
            res.data({});
        } else if(req.method == 'POST') {
        } else if(req.method == 'PUT') {
        } else if(req.method == 'DELETE') {
        } else if(req.method == 'OPTIONS') {
        }
    }
    
    return handleReq;
});

