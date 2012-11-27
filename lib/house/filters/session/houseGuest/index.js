// # Session Filter
//
// ## House Guest
//
// Thanks to help from http://blog.nodejitsu.com/sessions-and-cookies-in-node & https://github.com/marak/session.js
//
(exports = module.exports = function(house, options){
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('session')); });
    var options = (filter.session && filter.session.hasOwnProperty('houseGuest')) ? filter.session.houseGuest : {};
    
    var cookieDomain = options.cookieDomain || '';
    
    var sessions = {};
    var guestCount = 0;
    
    if(options.ds) {
        var ds = house.dataSources[options.ds];
        var col = options.col || 'sessions';
        
        ds.connected(function(){
            ds.info('/'+col, function(err, data) {
                if(err) {
                    
                } else {
                    guestCount = data.count;
                }
            });
        });
    }
        
    var getRandomId = function() {
        var chars,rand,i;
        var bits = 128;
        var chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        var ret='';
        while(bits > 0) {
          rand=Math.floor(Math.random()*0x100000000);
          for(i=26; i>0 && bits>0; i-=6, bits-=6) {
            ret+=chars[0x3F & rand >>> i];
          }
        }
        return ret;
    }
    
    var getSessionId = function(req, callback) {
        var match;
        
        if(req.headers.cookie && (match = /SID=([^ ,;]*)/.exec(req.headers.cookie))) {
          callback(match[1]);
        } else {
          callback(getRandomId());
        }
    }
    var getSidCookie = function(sid) {
        // set a cookie for the user response
        var d = (+new Date)+604800*1000;
        var cookieStr = 'SID='+sid+'; expires='+dateCookieString(d)+'; path=/;';
        if(cookieDomain && cookieDomain !== '') {
            cookieStr = cookieStr+' domain='+cookieDomain;
        }
        return cookieStr;
    }
    
    var persistSession = function(session, callback) {
        var doc = session.data;
        doc.sid = session.id;
        
        ds.insert(col, doc, function(err, data){
            if(_.isArray(data)) {
                data = _(data).first();
            }
            if(data._id) {
                session.data.id = data._id;
            }
            callback(err, data);
        });
    }
    
    var findSession = function(sid, callback) {
        ds.find(col, {"sid": sid}, function(err, data){
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(data) {
                if(data.length === 0) data = null;
                for(var i in data) {
                    callback(null, data[i]);
                    return;
                }
                callback(null, null);
            } else {
                var e = new Error('no data from mongo');
                house.log.err(e);
                callback(e);
            }
        });
    }
    
    var handleSocketAuth = function (data, accept) {
        if (data.headers.cookie) {
            
            var req = { "headers": { "cookie": data.headers.cookie
            }};
            
            var res = {}
            res.setHeader = function(setCookie, cookieHeaderValue) {
            }
            
            handleReq(req, res, function() {
                data.session = req.session.data;
                accept(null, true);
            });
        } else {
           return accept('No cookie transmitted.', false);
        }
    }
    house.io.set('authorization', handleSocketAuth);
    
    var handleReq = function(req, res, next) {
        req.session = {};
        
        //
        // Grant access from the current session to the given user
        //
        req.authorizeUser = function(data, callback) {
            console.log(data)
            if(_.isArray(data)) {
                data = _(data).first();
            }
            if(data.hasOwnProperty('id')) {
                data._id = data.id;
            }
            if(data.hasOwnProperty('_id')) {
                req.session.user = data._id;
                req.session.data.name = data.name;
                req.session.data.user = data._id;
                var changed = {
                    "user":req.session.user,
                    "name":req.session.data.name
                };
                if(data.hasOwnProperty('avatar')) {
                    req.session.data.avatar = data.avatar;
                    changed.avatar = data.avatar;
                }
                if(data.hasOwnProperty('groups')) {
                    req.session.data.groups = data.groups;
                    changed.groups = data.groups;
                }
                ds.update(col, {_id: req.session.data.id}, {"$set": changed}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                        if(callback) callback();
                    }
                });
            }
        }
        
        req.destroySession = function(callback) {
            var query = {_id: req.session.data.id};
            delete sessions[req.session.id];
            ds.remove(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                    callback();
                } else {
                    res.setHeader('Set-Cookie', 'SID=x; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;');
                    callback();
                }
            });
        }
        
        getSessionId(req, function(sid){
            res.setHeader('Set-Cookie', getSidCookie(sid));
            // quickly retrieve from memory
            if(sessions.hasOwnProperty(sid)) {
                req.session = sessions[sid];
                // TODO update session lastAt;
                next();
            } else {
                // look for session in storage
                findSession(sid, function(err, session) {
                    if(err || !session) {
                        // new session
                        sessions[sid] = req.session = {id: sid, user: false, data: {name: options.guestName + '' + (++guestCount)}};
                        
                        // persist new session to storage
                        persistSession(req.session, function(err, success){
                            next();
                        });
                    } else {
                        req.session.data = session;
                        sessions[sid] = req.session;
                        next();
                    }
                });
            }
        });
    };
    
    var dateCookieString = function(ms) {
        function pad(n){
            return n > 9 ? ''+n : '0'+n;
        }
        var d,wdy,mon;
        d=new Date(ms);
        wdy=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return wdy[d.getUTCDay()]+', '+pad(d.getUTCDate())+'-'+mon[d.getUTCMonth()]+'-'+d.getUTCFullYear()+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+':'+pad(d.getUTCSeconds())+' GMT';
    }
    
    return handleReq;
});
