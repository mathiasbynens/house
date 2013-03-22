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
            res.data(o);
        
        } else if(req.method == 'HEAD') {
            res.setHeader('X-Count', house.io.handshaken.length);
            res.data({});
        } else if(req.method == 'POST') {
        } else if(req.method == 'PUT') {
        } else if(req.method == 'DELETE') {
        } else if(req.method == 'OPTIONS') {
        }
    }
    
    return handleReq;
});

