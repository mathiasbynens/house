//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;
var useragent = require('useragent');
var events  = require('events');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var colRooms = options.roomsCollection;
    var colMsgs = options.messagesCollection;
    var colActions = 'actions';
    var socketOfPath = '/socket.io/io';
    var roomUsers = {};
    if(!house.io) {
        house.log.debug('house io not loaded');
        return function(req,res,next){
            if(next) {
                next();
            }
        };
    }
    house.io.rooms = house.io.of(socketOfPath);
    
    var leaveRoomSessionId = function(socket, roomId) {
        house.log.info('io - leaveRoomSessionId '+socket.id);
        if(house.io) {
            house.io.rooms.in('io').emit('deletedIo', socket.id);
        }
        if(house.ioi) {
            house.ioi.rooms.in('io').emit('deletedIo', socket.id);
        }
        if(roomId) {
            socket.leave(roomId);
            IOEE.emit('leave', {roomId: roomId, socket: socket});
        } else {
            IOEE.emit('leave', {socket: socket});
        }
        //updateRoomUserCount(roomId);
        logAction('IO left '+roomId, false, false, socket.handshake.session.id);
    }
    
    var emitToRoomIn = function(col, verb, doc) {
        var colVerb = verb + col.charAt(0).toUpperCase() + col.substr(1);
        if(_.isArray(doc)) {
            _.each(doc, function(doc) {
                emitToRoomIn(col, verb, doc);
            });
            return;
        }
        if(verb == 'deleted') {
            house.io.rooms. in (col).emit(colVerb, doc);
            return;
        }
        var user = doc.user;
        var ioRoomManager = house.io.rooms. in (col).manager;
        for(var id in ioRoomManager.handshaken) {
            var handshake = ioRoomManager.handshaken[id];
            var idSocket = house.io.rooms.socket(id);
            if(handshake.session.user == user) {
                idSocket. in (col).emit(colVerb, doc);
            } else if(handshake.session.groups && handshake.session.groups.length > 0) {
                if(handshake.session.groups.indexOf('admin') !== -1) {
                    idSocket. in (col).emit(colVerb, doc);
                }
            }
        }
    }
    
    var logAction = function(name, bandwidth, connections, sessionId) {
        var a = {
            a: name,
            t: 0,
        };
        // a.h = req.headers;
        if(sessionId) {
            a.s = sessionId;
        }
        if(connections) {
            a.c = connections;
        }
        if(bandwidth) {
            a.b = bandwidth;
            var totalInOut = a.b.i + a.b.o;
        
            // log bandwidth 
            var now = new Date();
            // var day = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
            now.setMilliseconds(0);
            now.setSeconds(0);
            now.setMinutes(0);
            now.setHours(0);
            var bandwidthUpdateDoc = {
                "$inc": {
                    t: totalInOut,
                    c: 1
                }
            }
            var query = {
                day: now,
                name: a.a,
            }
            var bandwidthCol = 'bandwidth';
            ds.update(bandwidthCol, query, bandwidthUpdateDoc, {"upsert": true}, function() {
                // house.log.debug('updated bandwidth for IO action');
            });
        }
        ds.insert(colActions, a, function(err, docs) {
            if(err) {
                house.log.err(err);
            } else {
                // console.log('actions docs');
                // console.log(docs);
                emitToRoomIn(colActions, 'inserted', docs);
            }
        });
    }
    
    var joinSocketRoomId = function(socket, roomId, secure) {
        socket.on('disconnect', function() {
            leaveRoomSessionId(socket, roomId);
        });
        socket.join(roomId);
        IOEE.emit('join', {roomId: roomId, socket: socket});
        var ioo = socket.handshake;
        ioo.id = socket.id;
        
        house.log.debug('io - join to io room '+roomId);
        
        if(secure) {
            ioo.rooms = house.io.roomClients[socket.id];
        } else {
            ioo.rooms = house.ioi.roomClients[socket.id];
        }
        if(socket.handshake.headers["user-agent"]) {
            var ag = useragent.lookup(socket.handshake.headers["user-agent"]);
            try {
                ioo.agent = ag.toJSON();
            } catch (e) {
                house.log.err(e);
            }
        }
        if(house.io) {
            house.io.rooms.in('io').emit('insertedIo', ioo);
        }
        if(house.ioi) {
            house.ioi.rooms.in('io').emit('insertedIo', ioo);
        }
        logAction('IO joined '+roomId, false, false, ioo.session.id);
    }
    
    house.io.rooms.authorization(function (data, accept) {
        accept(null, true);
    });
    house.io.sockets.on('connection', function(socket) {
        socket.on('disconnect', function() {
            leaveRoomSessionId(socket);
        });
    });
    house.io.rooms.on('connection', function (socket) {
        house.log.debug('io - user connected '+socket.id);
        //console.log(socket);
        socket.on('disconnect', function() {
            leaveRoomSessionId(socket);
            house.log.debug('io - user disconnect');
        });
        socket.on('leave', function(roomId) {
            house.log.debug('io - user left room '+roomId);
            leaveRoomSessionId(socket, roomId);
        });
        socket.on('join', function(roomId) {
            joinSocketRoomId(socket, roomId, true);
        });
    });
    
    if(house.ioi) {
        house.ioi.rooms = house.ioi.of(socketOfPath);
        house.ioi.rooms.authorization(function (data, accept) {
            accept(null, true);
        });
        house.ioi.sockets.on('connection', function(socket) {
            socket.on('disconnect', function() {
                leaveRoomSessionId(socket);
            });
        });
        house.ioi.rooms.on('connection', function (socket) {
            house.log.debug('ioi - user connected to '+socket.id);
            socket.on('disconnect', function() {
                leaveRoomSessionId(socket);
                house.log.info('ioi - user disconnect');
            });
            socket.on('leave', function(roomId) {
                house.log.info('ioi - user left room '+roomId);
                leaveRoomSessionId(socket, roomId);
            });
            socket.on('join', function(roomId) {
                joinSocketRoomId(socket, roomId);
            });
        });
    }
    if(!house.ioi) {
        house.ioi = {};
    }
    var emitDocToRoomOwnerGroupToIo = function(io, col, verb, doc, ownerId, groups) {
        var connectionCount = 0;
        var colVerb = verb+col.charAt(0).toUpperCase() + col.substr(1);
        if(_.isArray(doc)) {
            // TODO
            console.log('TODO emit array with connection counter')
            _.each(doc, function(doc) {
                emitDocToRoomOwnerGroupToIo(io, col, verb, doc, ownerId, groups);
            });
            return;
        }
        if(verb == 'deleted') {
            // only id 
            if(typeof doc === 'object') {
                if(doc instanceof ObjectID) {
                    
                } else if(doc.hasOwnProperty('id')) {
                    doc = doc.id;
                }
            }
        }
        var ioRoomManager = io.rooms.in(col).manager; // this doesnt seem to grab the namespace we want
        for(var id in ioRoomManager.handshaken) {
            var handshake = ioRoomManager.handshaken[id];
            
            var inColRoom = false;
            for(var roomPath in handshake.rooms) {
                if(roomPath && handshake.rooms[roomPath]) {
                    if(new RegExp(col+'$').test(roomPath)) {
                        inColRoom = true;
                    }
                }
            }
            
            if(inColRoom) {
                
                // Emit to the owner, group members, and admins, everyone for deletion id's
                
                var idSocket = io.rooms.socket(id);
                var emitToSocketId = function() {
                    idSocket.in(col).emit(colVerb, doc);
                    connectionCount++;
                }
                
                if(verb == 'deleted') {
                    emitToSocketId();
                } else if(handshake.session.groups && handshake.session.groups.indexOf('admin') !== -1) {
                    emitToSocketId();
                } else if(handshake.session.user && ownerId && (ownerId.toString() == handshake.session.user.toString())) {
                    emitToSocketId();
                } else if(groups.length > 0) {
                    if(groups.indexOf('public') !== -1) {
                        emitToSocketId();
                    } else if(handshake.session.groups && handshake.session.groups.length > 0) {
                        var hasGroup = false;
                        for(var g in groups) {
                            if(handshake.session.groups.indexOf(groups[g]) !== -1) {
                                hasGroup = true;
                            }
                        }
                        if(hasGroup) {
                            emitToSocketId();
                        }
                    }
                }
            }
        }
        return connectionCount;
    }
    
    // Use to emit doc to a room with owner and group permissions
    house.ioi.emitDocToRoomOwnerGroup = function(col, verb, doc, ownerId, groups, noLog) {
        // console.log('house.ioi.emitDocToRoomOwnerGroup');
        // console.log(groups);
        var connectionCount = emitDocToRoomOwnerGroupToIo(house.ioi, col, verb, doc, ownerId, groups);
        connectionCount = connectionCount + house.io.emitDocToRoomOwnerGroup(col, verb, doc, ownerId, groups, true);
        // console.log('number of socketioi emits '+connectionCount);
        // if(connectionCount < 1) connectionCount = 1;
        if(!noLog) {
            var m = connectionCount || 1;
            // console.log(doc);
            logAction('IO '+verb+' '+col, {i:0, o: (house.utils.string.getBytes(doc) * m)}, connectionCount);
        }
        return connectionCount;
    }
    
    // Secure only version
    house.io.emitDocToRoomOwnerGroup = function(col, verb, doc, ownerId, groups, noLog) {
        // console.log('house.io.emitDocToRoomOwnerGroup');
        var connectionCount = emitDocToRoomOwnerGroupToIo(house.io, col, verb, doc, ownerId, groups);
        // console.log('number of socketio emits '+connectionCount);
        if(!noLog) {
            var m = connectionCount || 1;
            logAction('IO '+verb+' '+col, {i:0, o: (house.utils.string.getBytes(doc) * m)}, connectionCount);
        }
        return connectionCount;
    }
    
    var countRoomUsersOf = function(io, room, of) { 
        var c = 0;
        if(of) {
            var ioRoomManager = io.of('/socket.io/'+of).in(room).manager;
        } else {
            var ioRoomManager = io.rooms.in(room).manager; // this doesnt seem to grab the namespace we want
        }
        for(var id in ioRoomManager.handshaken) {
            var handshake = ioRoomManager.handshaken[id];
            
            for(var roomPath in handshake.rooms) {
                if(roomPath && handshake.rooms[roomPath]) {
                    if(new RegExp(room+'$').test(roomPath)) {
                        c++;
                    }
                }
            }
        }
        
        return c;
    }
    
    house.ioi.ofInRoomEmit = function(of, room, verb, data, noLog) {
        // console.log(typeof room)
        room = room.toString();
        // console.log(noLog)
        house.ioi.of('/socket.io/'+of).in(room).emit(verb, data);
        
        // var connectionCount = _.size(house.ioi.rooms.in(room).manager.handshaken);
        var connectionCount = countRoomUsersOf(house.ioi, room, of);
        if(house.io) {
            connectionCount = connectionCount + house.io.ofInRoomEmit(of, room, verb, data, true);
        }
        console.log('IO '+verb)
        if(!noLog) {
            var m = connectionCount || 1;
            console.log('IO '+m)
            logAction('IO '+verb+' '+room, {i:0, o: (house.utils.string.getBytes(data) * m)}, connectionCount);
        }
        return connectionCount;
    }
    house.io.ofInRoomEmit = function(of, room, verb, data, noLog) {
        console.log(typeof room)
        room = room.toString();
        console.log('house.io.inRoomEmit '+room+' '+verb)
        house.io.of('/socket.io/'+of).in(room).emit(verb, data);
        // var connectionCount = _.size(house.io.rooms.in(room).manager.handshaken);
        var connectionCount = countRoomUsersOf(house.io, room, of);
        if(!noLog) {
            var m = connectionCount || 1;
            logAction('IO '+verb+' '+room, {i:0, o: (house.utils.string.getBytes(data) * m)}, connectionCount);
        }
        return connectionCount;
    }
    
    
    
    
    
    /*
    house.io.emitToRoomDocOwnerId = function(col, verb, doc, secureOnly) {
        if(!doc.owner) {
            return;
        }
        if(verb == 'deleted') {
            house.io.emitToRoomDocAndOwnerId(col, verb, doc.id, doc.owner.id, secureOnly);
        } else {
            house.io.emitToRoomDocAndOwnerId(col, verb, doc, doc.owner.id, secureOnly);
        }
    }
    house.io.emitToRoomDocUserId = function(col, verb, doc, secureOnly) {
        // house.log.debug('emitToRoomDocUserId '+col+ ' '+verb);
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
    }*/
    
    var ioEndpointEvents = function() {
        if (!(this instanceof ioEndpointEvents)) {
            return new ioEndpointEvents();  
        } 
        events.EventEmitter.call(this);
    }
    util.inherits(ioEndpointEvents, events.EventEmitter);
    
    var IOEE = new ioEndpointEvents();
    
    var handleReq = function(req, res, next) {
        if(!req) {
            // IOEE.emit('test');
            return IOEE;
        }
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

