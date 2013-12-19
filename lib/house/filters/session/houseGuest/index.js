// # Session Filter
//
// ## House Guest
//
// Thanks to help from http://blog.nodejitsu.com/sessions-and-cookies-in-node & https://github.com/marak/session.js
//
(exports = module.exports = function(house, options){
    var spawn = require('child_process').spawn;
    var useragent = require('useragent');
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('session')); });
    var options = (filter.session && filter.session.hasOwnProperty('houseGuest')) ? filter.session.houseGuest : {};
    
    var cookieDomain = options.cookieDomain || '';
    
    var sessions = {};
    var guestCount = 0;
    
    house.auth = {
        
    };
    
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
            if(req.headers.hasOwnProperty('user-agent')) {
                var userAgent = req.headers["user-agent"];
              if (userAgent.indexOf('bingbot') !== -1) {
                  callback('jwZILJbrdFCVwV7r1HyT/D2GJPIz2exAFzTO6oJuV3X',req);
              } else if (userAgent.indexOf('BingPreview') !== -1) {
                  callback('wCOx376dJHvrcBpJo+5nD0q6hW8pJqkc9/8s0dD0g0Z',req);
              } else if (userAgent.indexOf('YandexBot') !== -1) {
                  callback('31lHrKCXU2vXdeDaCO3TE2vPiE70qSXEdMm3qdjBeT',req);
              } else if (userAgent.indexOf('Googlebot') !== -1) {
                  callback('jIklEK3zunZJD306IhG0+gwzAmY4bJIP2Lqjkz4Cq7J',req);
              } else if (userAgent.indexOf('AhrefsBot') !== -1) {
                  callback('z399xQFZow2zqhzfxpf9LKALrcj0otp1Ts7QNjIrklz',req);
              } else if (userAgent.indexOf('aiHitBot') !== -1) {
                  callback('U8H9afQo5HKAQcQXLUix+w7Lwqbdez7V5JIeBw7zAWx',req);
              } else if (userAgent.indexOf('Googlebot') !== -1) {
                  callback('jIklEK3zunZJD306IhG0+gwzAmY4bJIP2Lqjkz4Cq7J',req);
              } else if (userAgent.indexOf('Feedfetcher-Google') !== -1) {
                  callback('1PJSGrO0ksSbsCtQCmtPKeBUDgQJL4xek6m9JZv3ZM0',req);
              } else if (userAgent.indexOf('facebookexternalhit') !== -1) {
                  callback('tMRN2s2PqeJhYvwcvkaBRkiOyDkam6jOj6NacDeT8ap',req);
              } else if (userAgent.indexOf('Pingdom.com_bot') !== -1) {
                  callback('pingdombot',req);
              } else if (userAgent.indexOf('ezooms.bot') !== -1) {
                  callback('ezoomsbot',req);
              } else if (userAgent.indexOf('Baiduspider') !== -1) {
                  callback('Baiduspider',req);
              } else if (userAgent.indexOf('FeedBurner') !== -1) {
                  callback('FeedBurner',req);
              } else if (userAgent.indexOf('Feed Wrangler') !== -1) {
                  callback('FeedWrangler',req);
              } else if (userAgent.indexOf('munin http-loadtime') !== -1) {
                  callback('munin http-loadtime',req);
              } else {
                  if (userAgent.indexOf('bot') !== -1) {
                    house.log.info('bot agent: '+userAgent);
                  }
                  var ip = getIpFromReq(req);
                  if(ip) {
                      var sessionFind = {ip: ip, userAgent: userAgent, user: {"$exists":false}};
                      ds.find(col, sessionFind, function(err, data){
                          if(err) {
                              house.log.err(err);
                          } else {
                              if(data.length == 0) {
                                  callback(getRandomId());
                              } else {
                                  var doc = _.first(data);
                                  house.log.info('found you cookie-less user!');
                                  callback(doc.sid);
                              }
                          }
                      });
                    } else {
                        callback(getRandomId());
                    }
              }
            } else {
                callback(getRandomId());
            }
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
    
    var lookupIpGeoLocation = function(ip, callback) {
        // console.log('geo ip '+ip);
        var runGeo = '';
        var runGeoIpLookup = spawn('geoiplookup', ['-f', '/usr/local/share/GeoIP/GeoIPCity.dat', ip]);
        var didCb = false;
        var doCallback = function(g) {
            if(didCb === false) {
                didCb = true;
                if(callback) {
                    callback(g);
                }
            }
        }
        
        runGeoIpLookup.on('error', function (err) {
            house.log.err('runGeoIpLookup exception:');
            house.log.err(err);
        });
        
        runGeoIpLookup.on('close', function (code) {
            if(code !== 0) {
                house.log.debug('runGeoIpLookup child process closed with code ' + code);
            }
            house.log.debug(runGeo);
            if(code === 0) {
                
                if(runGeo.indexOf('IP Address not found') !== -1) {
                    doCallback();
                } else {
                    
                    house.log.debug('runGeoIpLookup child process closed with code ' + code);
                    var geoStr = runGeo.substr(runGeo.indexOf(': ')+2);
                    var geoArr = geoStr.split(', ');
                    // console.log(geoArr)
                    var geo = {"country": geoArr[0], "state": geoArr[1], "city": geoArr[2], "zip": geoArr[3], "loc": [geoArr[4], geoArr[5]]};
                    doCallback(geo);
                }
            } else {
                doCallback();
            }
        });
        runGeoIpLookup.stdout.on('data', function (data) {
            runGeo += data.toString();
        });
        //runGeoIpLookup.stdout.setEncoding('utf8');
        runGeoIpLookup.stderr.setEncoding('utf8');
        runGeoIpLookup.stderr.on('data', function (data) {
            if (/^execvp\(\)/.test(data)) {
                house.log.debug('geoiplookup not found!');
            } else {
                house.log.debug('stderr: ' + data);
            }
            // doCallback();
        });
    }
    
    var lookupIpHostname = function(ip, callback) {
        var runO = '';
        var runFile = spawn('nslookup', [ip]);
        runFile.on('close', function (code) {
            if(code !== 0) {
                house.log.debug('nslookup child process closed with code ' + code);
            }
          var searchStr = 'name = ';
          var searchName = runO.indexOf(searchStr);
          
          if(searchName !== -1) {
              var hostname = runO.substring(searchName+searchStr.length, runO.indexOf('\n',searchName+5));
              
              callback(hostname);
          } else {
            callback(null);
          }
        });
        runFile.stdout.on('data', function (data) {
          runO += data.toString();
        });
        
        runFile.stderr.on('data', function (data) {
          house.log.debug('stderr: ' + data);
        });
    }
    
    var inspectDocAndUpdateId = function(doc, id, callback) {
        var ip = doc.host.ip;
        if(!ip) {
            callback();
            return;
        }
        // house.log.debug('inspectDocAndUpdateId');
        // house.log.debug(id);
        var agent = doc.userAgent;
        var ag = useragent.lookup(doc.userAgent);
        try {
            agent = _.clone(ag.toJSON());
        } catch (e) {
            house.log.debug('useragent lookup clone to json failed');
            house.log.err(e);
        }
        var updateIpInfo = {"$set":{"agent":agent}};
        
        lookupIpHostname(ip, function(hostname) {
            if(hostname) {
                updateIpInfo["$set"]["host.name"] = hostname;
            }
            lookupIpGeoLocation(ip, function(geo) {
                // console.log(geo);
                if(geo) {
                    updateIpInfo["$set"]["geo"] = geo;
                }
                // house.log.debug('----updateIpInfo');
                // house.log.debug(updateIpInfo);
                var query = {"_id": id};
                ds.update(col, query, updateIpInfo, function(){
                    //house.log.debug('updated session with ip info');
                    if(callback) {
                        callback();
                    }
                });
            });
        });
    };
    
    var getIpFromReq = function(req) {
        var ip = '';
        if(req.hasOwnProperty('connection')) {
            ip = req.connection.remoteAddress;
        }
        if(req.headers.hasOwnProperty('x-forwarded-for')) {
            ip = req.headers['x-forwarded-for'] || ip;
        } else if(req.headers.hasOwnProperty('x-real-ip')) {
            ip = req.headers['x-real-ip'] || ip;
        } else if(req.hasOwnProperty('socket') && req.socket.hasOwnProperty('remoteAddress')) {
            ip = req.socket.remoteAddress || ip;
        } else if(req.hasOwnProperty('connection') && req.connection.hasOwnProperty('socket') && req.connection.socket.hasOwnProperty('remoteAddress')) {
            ip = req.connection.socket.remoteAddress || ip;
        }
        return ip;
    }
    
    var persistSession = function(req, callback) {
        var ip = getIpFromReq(req);
        var userAgent = req.headers["user-agent"];
        //house.log.debug('persist session');
        var doc = req.session.data;
        doc.sid = req.session.id;
        doc.host = {ip: ip};
        doc.userAgent = userAgent;
        if(req.headers.hasOwnProperty('referer')) {
            doc.referer = req.headers.referer;
        }
        
        ds.insert(col, doc, function(err, data){
            if(err) {
                house.log.err(err);
                callback(err);
            } else {
                if(_.isArray(data)) {
                    data = _(data).first();
                }
                var id;
                if(data._id) {
                    req.session.data.id = data._id;
                    id = data._id;
                }
                if(data.id) {
                    req.session.data.id = data.id;
                    id = data.id;
                }
                //house.log.debug('data');
                //house.log.debug(data);
                inspectDocAndUpdateId(doc, data.id, function(docs){
                    ds.find(col, {_id:data._id}, function(err, data) {
                        if(err) {
                            house.log.err(err);
                        } else {
                            emitToRoomIn(col, 'inserted', data);
                        }
                    });
                });
                callback(err, data);
            }
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
    
    var findUserSessions = function(user, callback) {
        ds.find(col, {"user": user}, function(err, data){
            if(err) {
                house.log.err(err);
                callback(err);
            } else if(data) {
                callback(null, data);
            } else {
                var e = new Error('no data from mongo');
                house.log.err(e);
                callback(e);
            }
        });
    }
    
    var updateSessionLastAt = function(req) {
        var prev = req.session.data.lastAt || new Date();
        var nowLastAt = new Date();
        var updateO = {"$set": {"lastAt": nowLastAt}};
        updateO["$inc"] = {"c": 1};
        req.session.data.c++;
        
        var diff = nowLastAt - prev;
        var fiveMinutesOfMilliseconds = 1000 * 5 * 60 * 60;
        
        if(diff > fiveMinutesOfMilliseconds) {
            // an idle visitor returns!
        } else {
            // welcome back!
            
            // lets add the time since your last visit to your duration
            var newSeconds = Math.floor(diff / 1000);
            if(newSeconds > 0) {
              updateO["$inc"]["d"] = newSeconds;
              req.session.data.d = req.session.data.d + newSeconds;
            }
        }
        var query = {_id: req.session.data.id};
        ds.update(col, query, updateO, function(){
            ds.find(col, query, function(err, data) {
                if(err) {
                    house.log.err(err);
                } else {
                    var updatedDoc = _.first(data);
                    if(updatedDoc) {
                        emitToRoomIn(col, 'updated', updatedDoc);
                    }
                }
            });
        });
        
        var newAction = function(name, type) {
            var a = {a: name, t: type};
            a.h = req.headers; // too much?
            a.s = req.session.data.id;
            var colActions = 'actions';
            ds.insert(colActions, a, function(err, docs) {
                if(err) {
                    house.log.err(err);
                } else {
                    emitToRoomIn(colActions, 'inserted', docs);
                }
            });
        }
        
        // filter out fake sessions from socket.io for now
        if(req.hasOwnProperty('method')) {
          newAction(req.method + ' ' + req.url, 0);
        }
        
        return nowLastAt;
    };
    
    var emitToRoomIn = function(col, verb, doc) {
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
        var user = doc.user;
        var ioRoomManager = house.io.rooms.in(col).manager;
        for(var id in ioRoomManager.handshaken) {
            var handshake = ioRoomManager.handshaken[id];
            var idSocket = house.io.rooms.socket(id);
            if(handshake.session.user == user) {
                idSocket.in(col).emit(colVerb, doc);
            } else if(handshake.session.groups && handshake.session.groups.length > 0) {
                if(handshake.session.groups.indexOf('admin') !== -1) {
                    idSocket.in(col).emit(colVerb, doc);
                }
            }
        }
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
    if(house.io) {
        house.io.set('authorization', handleSocketAuth);
    }
    if(house.ioi) {
        house.ioi.set('authorization', handleSocketAuth);
    }
    
    // Update our sessions with an upaded user document
    house.auth.updateUserSessions = function(user, callback) {
        var userId = user.id;
        findUserSessions(userId, function(err, docs) {
            if(err) {
                house.log.err(err);
                if(callback) callback(err);
            } else if(docs.length > 0) {
                for(var i in docs) {
                    var sid = docs[i].sid;
                    var changed = {};
                    if(user.hasOwnProperty('avatar')) {
                        changed.avatar = user.avatar;
                    }
                    if(user.hasOwnProperty('groups')) {
                        changed.groups = user.groups;
                    }
                    var query = {sid: sid};
                    ds.update(col, query, {"$set": changed}, function(err, data){
                        if(err) {
                            house.log.err(err);
                        } else {
                            if(sessions.hasOwnProperty(sid)) {
                                // remove it from memory so that the latest can be refreshed
                                delete sessions[sid];
                            }
                        }
                    });
                }
                if(callback) callback(null);
            }
        });
    }
    
    var handleReq = function(req, res, next) {
        req.session = {};
        
        var userAgent = req.headers["user-agent"];
        req.userAgent = userAgent;
        req.ip = getIpFromReq(req);
        house.log.info(req.ip+' '+userAgent+' '+req.method+' '+req.url); // user agent
        
        //
        // Grant access from the current session to the given user
        //
        req.authorizeUser = function(data, callback) {
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
                var query = {_id: req.session.data.id};
                ds.update(col, query, {"$set": changed}, function(err, data){
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                        if(callback) callback();
                        
                        ds.find(col, query, function(err, data) {
                            if(err) {
                                house.log.err(err);
                                console.log('auth error');
                            } else {
                                var updatedDoc = _.first(data);
                                emitToRoomIn(col, 'updated', updatedDoc);
                            }
                        });
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
            if(!req.cookies) {
                req.cookies = [];
            }
            req.cookies["SID"] = sid;
            res.setHeader('Set-Cookie', getSidCookie(sid));
            // quickly retrieve from memory
            if(sessions.hasOwnProperty(sid)) {
                req.session = sessions[sid];
                req.session.data.lastAt = updateSessionLastAt(req);
                next();
            } else {
                // look for session in storage
                findSession(sid, function(err, session) {
                    if(err || !session) {
                        // new session
                        sessions[sid] = req.session = {id: sid, user: false, data: {name: options.guestName + '' + (++guestCount)}};
                        
                        // persist new session to storage
                        persistSession(req, function(err, success){
                            next();
                            req.session.data.lastAt = updateSessionLastAt(req);
                        });
                    } else {
                        req.session.data = session;
                        sessions[sid] = req.session;
                        next();
                        req.session.data.lastAt = updateSessionLastAt(req);
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
