//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;

(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var colRooms = options.roomsCollection;
    var colMsgs = options.messagesCollection;
    
    var roomUsers = {};
    
    var io = house.io.rooms = house.io.of('/socket.io/io');
    io.authorization(function (data, accept) {
        accept(null, true);
    });
    io.on('connection', function (socket) {
        house.log.debug('user connected to io');
        
        var leaveRoomSessionId = function(roomId, sessionId) {
            //io.in(roomId).emit('exited', {room_id: roomId, user: roomUsers[roomId][socket.handshake.session.id]});
            socket.leave(roomId);
            delete roomUsers[roomId][socket.handshake.session.id];
            //updateRoomUserCount(roomId);
        }
        
        socket.on('join', function(roomId) {
            if(!roomUsers.hasOwnProperty(roomId)) {
                roomUsers[roomId] = {};
            }
            roomUsers[roomId][socket.handshake.session.id] = {
                name: socket.handshake.session.name,
                id: socket.handshake.session.id
            }
            if(socket.handshake.session.avatar) {
                roomUsers[roomId][socket.handshake.session.id].avatar = socket.handshake.session.avatar;
            }
            socket.join(roomId);
            house.log.info('join to io room '+roomId);
            
            //io.in(roomId).emit('entered', {room_id: roomId, user: roomUsers[roomId][socket.handshake.session.id]});
            
            socket.on('disconnect', function () {
              house.log.info('user disconnected from io.chat');
              leaveRoomSessionId(roomId, socket.handshake.session.id);
            });
        });
        socket.on('leave', function(roomId) {
            house.log.info('user left room '+roomId);
            leaveRoomSessionId(roomId, socket.handshake.session.id);
        });
    });
    
    var handleReq = function(req, res, next) {
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
        } else if(req.method == 'POST') {
        } else if(req.method == 'PUT') {
        } else if(req.method == 'DELETE') {
        } else if(req.method == 'OPTIONS') {
        }
    }
    
    return handleReq;
});

