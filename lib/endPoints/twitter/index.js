//
// # Twitter API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
var crypto = require('crypto');
var oauth = require('oauth');
var OAuth = oauth.OAuth;
var OAuthTwo = oauth.OAuth2;
var email = require("emailjs-plus/email");
var moment = require("moment");
var TwitterUserStream = require('user-stream');
(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var filesRoot = 'files';
    var colFiles = options.collectionFiles || filesRoot+'.files';
    var subsCol = options.collectionSubs || 'subs';
    var contactsCol = options.collectionContacts || 'contacts';
    var usersCol = 'users';
    var imagesCol = 'images';
    var feedEndPoint = house.api.getEndPointByName("feed");
    var ioEndPoint = house.api.getEndPointByName("io");
    var events  = require('events');
    var articlesCol = options.collectionArticles || 'articles';
    
    var baseUrl = 'https://api.twitter.com/1.1/';
    
    var getTwitterOAuth = function() {
        if(!options.twitter || !options.twitter.urls.endPoint) {
            house.log.err(new Error('options.twitter required'));
            return;
        }
        var oa = new OAuth(options.twitter.urls.requestToken, options.twitter.urls.accessToken,
            options.twitter.key, options.twitter.secret,
            "1.0A", options.twitter.urls.endPoint, "HMAC-SHA1");
        return oa;
    }
    
    var getTwitterOAuthTwo = function() {
        if(!options.twitter || !options.twitter.urls.endPoint) {
            house.log.err(new Error('options.twitter required'));
            return;
        }
        var oauth2 = new OAuthTwo(options.twitter.key, options.twitter.secret, 'https://api.twitter.com/', null, 'oauth2/token', null);
        return oauth2;
    }
    
    var oa = getTwitterOAuth();
    var oaGetUrlWithSession = function(url, twitterSession, callback) {
        oa.get(url, twitterSession.token, twitterSession.secret, function (e, data, res) {
            if (e) {
                console.error(e);
                callback(e);
            } else {
                try {
                    var jsonData = JSON.parse(data);
                    if(jsonData.statusCode === 429) {
                        house.log.debug('err with jsonData');
                        house.log.debug(jsonData);
                        if(callback) {
                            callback(null);
                        }
                    } else {
                        // console.log(jsonData);
                        if(callback) {
                            callback(null, jsonData);
                        }
                    }
                } catch(e) {
                    callback(e);
                }
            }
        });
    }
    
    var findUserById = function(id, callback) {
        ds.find(usersCol, {_id: id}, function(err, data) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else {
                if(data.length > 0) {
                    var user = _.first(data);
                    callback(null, user);
                } else {
                    callback(new Error("no user found"));
                }
            }
        });
    }
    
    var updateUserIdWithDoc = function(userId, doc, cb) {
        ds.update(usersCol, {_id: userId}, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incUserField = function(userId, field, b) {
        b = b || 1;
        var updateDoc = {"$inc":{}};
        updateDoc["$inc"][field] = b;
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserComments = function(userId, b) {
        incUserField(userId, 'commentsCount', b);
    }
    
    var saveTweet = function(session, tweet) {
        var screenName = (tweet.hasOwnProperty('user') && tweet.user.screen_name) ? tweet.user.screen_name : '';
        var permaLink = 'https://twitter.com/'+screenName+'/status/'+tweet.id_str;
        var article = {
            summary: tweet.text,
            date: new Date(tweet.created_at),
            author: '@'+screenName,
            link:  permaLink,
            guid:  permaLink,
            tweet: tweet
        }
        if(tweet.hasOwnProperty('entities')) {
            article.entities = tweet.entities;
            if(tweet.entities.hasOwnProperty('urls') && _.size(tweet.entities.urls) > 0) {
                // console.log(e.entities.urls);
                //[ { url: 'http://t.co/QraeeHqK1x',
                // expanded_url: 'http://dlvr.it/4TW0Ry',
                // display_url: 'dlvr.it/4TW0Ry',
                // indices: [ 107, 129 ] } ]
            }
        }
        article["fromUrl"] = 'https://twitter.com/'+screenName;

        var postArticle = function(newArticle) {
            var articlesEndPoint = house.api.getEndPointByName(articlesCol);
            articlesEndPoint({
                session: session,
                method: 'POST',
                url: '',
                fields: newArticle
            }, {
                end: function() {},
                data: function(data) {
                    if(_.isArray(data)) {
                        data = _.first(data);
                    }
                    house.log.debug('twitter endpoint article posted with tweet');
                },
                writeHead: function() {}
            });
        }
        
        article.socialShares = {total: 0, twitter: 0};
        if(article.tweet.favorite_count) {
            article.socialShares.total = article.socialShares.total + article.tweet.favorite_count;
            article.socialShares.twitter = article.socialShares.twitter + article.tweet.favorite_count;
        }
        if(article.tweet.retweet_count) {
            article.socialShares.total = article.socialShares.total + article.tweet.retweet_count;
            article.socialShares.twitter = article.socialShares.twitter + article.tweet.retweet_count;
        }
        postArticle(article);
    }
    
    var postContactDoc = function(session, doc, callback) {
        if(!session.hasOwnProperty('data')) {
            house.log.err('deleteSubUrl requires session.data');
            return;
        }
        var contactsEndPoint = house.api.getEndPointByName(contactsCol);
        contactsEndPoint({
            session: session,
            method: 'POST',
            url: '',
            fields: doc
        }, {
            end: function() {},
            data: function(newData) {
                if(_.isArray(newData)) {
                    newData = _.first(newData);
                }
                if(callback) {
                    callback(null, newData);
                }
            },
            writeHead: function() {}
        });
    }
    var deleteSubUrl = function(session, doc, callback) {
        if(!session.hasOwnProperty('data')) {
            house.log.err('deleteSubUrl requires session.data');
            return;
        }
        var subsEndPoint = house.api.getEndPointByName(subsCol);
        subsEndPoint({
            session: session,
            method: 'DELETE',
            url: '',
            fields: doc
        }, {
            end: function() {},
            data: function(data) {
                if(callback) {
                    callback(null, data);
                }
            },
            writeHead: function() {}
        });
    }
    var postSubDoc = function(session, doc, callback) {
        // POST sub
        var subsEndPoint = house.api.getEndPointByName(subsCol);
        subsEndPoint({
            session: session,
            method: 'POST',
            url: '',
            fields: doc
        }, {
            end: function() {},
            data: function(newData) {
                if(_.isArray(newData)) {
                    newData = _.first(newData);
                }
                console.log(newData);
                if(callback) {
                    callback(null, newData);
                }
            },
            writeHead: function() {}
        });
    }
    var deleteTwitterFriend = function(session, twitterFriend, callback) {
        deleteSubUrl(session, {url: 'https://twitter.com/'+twitterFriend.screen_name}, function(err, data) {
            if(err) {
                house.log.err(err);
            } else {
                house.log.debug('deleted twitter friend as subscription');
                
                if(callback) {
                    callback();
                }
            }
        });
    }
    var postTwitterFriend = function(session, twitterFriend, callback) {
        var newContact = {
            twitter: twitterFriend
        }
        postContactDoc(session, newContact, function(err, data) {
            if(err) {
                house.log.err(err);
            } else {
                house.log.debug('posted twitter friend as contact')
                
                var newSub = {
                    url: 'https://twitter.com/'+twitterFriend.screen_name,
                    twitterUser: twitterFriend,
                    source: "twitter"
                }
                postSubDoc(session, newSub, function(err, data) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug('posted twitter friend as subscription');
                        
                        if(callback) {
                            callback();
                        }
                    }
                });
            }
        });
    }
    var twitterUserStreams = {};
    
    var getUserStatusHomeTimeline = function(userDoc) {
        house.log.debug('getUserStatusHomeTimeline '+baseUrl+'statuses/home_timeline.json');
        var tmpUserSession = {data: {user: userDoc.id, name: userDoc.name}};
        oaGetUrlWithSession(baseUrl+'statuses/home_timeline.json', userDoc.twitterSession, function(err, data){
            if(err) {
                house.log.err(err);
            } else {
                for(var i in data) {
                    var tweetJson = data[i];
                    saveTweet(tmpUserSession, tweetJson);
                }
            }
        });
    }
    
    var startUserStreamForSocket = function(socket) {
        var handshake = house.io.handshaken[socket.id];
        // console.log(handshake)
        if(handshake.session && handshake.session.user) {
            findUserById(handshake.session.user, function(err, userDoc){
                if(err) {
                    house.log.err(err);
                } else {
                    if(userDoc.twitterSession && userDoc.twitterSession.token && userDoc.twitterSession.secret) {
                        
                        // Also grab the latest statuses/home_timeline
                        getUserStatusHomeTimeline(userDoc);
                        
                        var twitterUserStream = new TwitterUserStream({
                            consumer_key: options.twitter.key,
                            consumer_secret: options.twitter.secret,
                            access_token_key: userDoc.twitterSession.token,
                            access_token_secret: userDoc.twitterSession.secret
                        });
                        var tmpUserSession = {data: {user: userDoc.id, name: userDoc.name}};
                        
                        //create stream
                        house.log.debug('start twitter user stream');
                        twitterUserStream.stream();
                        twitterUserStream.on('garbage', function(garbage) {
                            house.log.debug('twitterUserStream-garbage');
                            house.log.debug(garbage);
                        });
                        twitterUserStream.on('error', function(err) {
                            house.log.debug('twitterUserStream-err');
                            house.log.err(err);
                        });
                        twitterUserStream.on('connected', function() {
                            house.log.debug('twitterUserStream-connected');
                        });
                        twitterUserStream.on('heartbeat', function() {
                            house.log.debug('twitterUserStream-heartbeat');
                        });
                        //listen stream data
                        twitterUserStream.on('data', function(json) {
                            house.log.debug('twitterUserStream-data')
                            
                            if(json.hasOwnProperty('event')) {
                                var eventName = json.event;
                                if(eventName === 'follow') {
                                    house.log.debug('follow');
                                    if(json.hasOwnProperty('source') && json.hasOwnProperty('target')) {
                                        var twitterUser = json.source;
                                        var twitterFriend = json.target;
                                        
                                        // TODO check to make sure the source user is of this session. if()
                                        postTwitterFriend(tmpUserSession, twitterFriend, function(){
                                            house.log.debug('twitter friend posted');
                                        });
                                    }
                                } else if(eventName === 'unfollow') {
                                    house.log.debug('unfollow');
                                    if(json.hasOwnProperty('source') && json.hasOwnProperty('target')) {
                                        var twitterUser = json.source;
                                        var twitterFriend = json.target;
                                        deleteTwitterFriend(tmpUserSession, twitterFriend, function(){
                                            house.log.debug('twitter friend deleted');
                                        });
                                    }
                                } else if(eventName === 'favorite') {
                                    if(json.hasOwnProperty('source') && json.hasOwnProperty('target_object')) {
                                        var tweet = json.target_object;
                                        saveTweet(tmpUserSession, tweet);
                                    }
                                } else {
                                    house.log.debug('event not handled');
                                    house.log.debug(json);
                                }
                            } else if(json.hasOwnProperty('friends')) {
                                house.log.debug('twitterUserStream-friends');
                                var friendsArr = json.friends;
                                for(var f in friendsArr) {
                                    var friendId = friendsArr[f];
                                    //
                                }
                            } else if(json.hasOwnProperty('text') && json.hasOwnProperty('id_str')) {
                                house.log.debug('tweet');
                                saveTweet(tmpUserSession, json);
                            }
                        });
                        twitterUserStreams[socket.id] = twitterUserStream;
                    }
                }
            });
        }
    }
    var stopUserStreamForSocket = function(socket) {
        var handshake = house.io.handshaken[socket.id];
        // console.log(handshake)
        if(handshake.session && handshake.session.user && twitterUserStreams.hasOwnProperty(socket.id)) {
            var twitterUserStream = twitterUserStreams[socket.id]; ///
            //create stream
            house.log.debug('stop twitter user stream');
            twitterUserStream.destroy();
        }
    }
    
    if(house.io) {
        var ioEv = ioEndPoint();
        ioEv.on('join', function(data){
            if(data.hasOwnProperty('roomId') && data.hasOwnProperty('socket')) {
                var roomId = data.roomId;
                if(roomId === 'subs') {
                    var socket = data.socket;
                    startUserStreamForSocket(socket);
                }
            }
        });
        ioEv.on('leave', function(data){
            if(data.hasOwnProperty('roomId') && data.hasOwnProperty('socket')) {
                var roomId = data.roomId;
                if(roomId === 'subs') {
                    var socket = data.socket;
                    stopUserStreamForSocket(socket);
                }
            } else {
                // console.log('no room id, try to stop anyways');
                // var socket = data.socket;
                // stopUserStreamForSocket(socket);
            }
        });
    }
    var handleReq = function(req, res, next) {
        events.EventEmitter.call(this);
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
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
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
            //} else if(req.session.data.user) {
            } else {
                query["user.id"] = req.session.data.user;
            }
            ds.count(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else {
                    res.setHeader('X-Count', data);
                    res.data({});
                }
            });
        }
        var filterData = function(data) {
            /*if(!_.isArray(data)) {
                if(data.hasOwnProperty('updates')) {
                    _.each(data.updates, function(doc,ii){
                        delete data.updates[ii].src;
                    });
                }
            } else {
                _.each(data, function(doc, i){
                    if(doc.hasOwnProperty('updates')) {
                        _.each(doc.updates, function(doc,ii){
                            delete data[i].updates[ii].src;
                        });
                    }
                });
            }*/
            return data;
        }
        var findQuery = function(query) {
            if(query.id) {
                query._id = query.id;
                delete query.id;
            }
            if(query.hasOwnProperty('_id') && typeof query._id == 'string') {
                try {
                    query._id = new ObjectID(query._id);
                } catch(e) {
                    console.log('bad object id');
                }
            }
            
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {
                if(!query.hasOwnProperty('user.id') && !query.hasOwnProperty('user')) {
                    query["user.id"] = req.session.data.user;
                }
            //} else if(req.session.data.user) {
            } else {
                query["user.id"] = req.session.data.user;
            }
            ds.find(col, query, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    data = filterData(data);
                    res.data(data);
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {"col": "comments", "id": doc.id},
                "comment": doc,
                "groups": doc.groups,
                "owner": doc.user,
                "at": doc.at,
            }
            feedEndPoint({session: req.session, method: 'POST', url: '', fields: newFeedItem}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
                ds.update(col, {"_id": doc.id}, {"$set": {"feed": {id:newFeedData.id,at:newFeedData.at}}}, function(err, data) {
                    if(callback) {
                        callback(newFeedData);
                    }
                });
            },writeHead:function(){}});
        }
        var updateDocInFeed = function(doc) {
            var updateDoc = {
                "$set": {
                    "comment": doc,
                    "groups": doc.groups,
                    "owner": doc.user,
                    "at": doc.at,
                }
            }
            feedEndPoint({session: req.session, method: 'PUT', url: '/'+doc.feed.id, fields: updateDoc}, {end:function(){}, data:function(newFeedData){
                if(_.isArray(newFeedData)) {
                    newFeedData = _.first(newFeedData);
                }
            },writeHead:function(){}});
        }
        var removeDocFromFeed = function(doc) {
            if(doc.feed && doc.feed.id) {
                feedEndPoint({session: req.session, method: 'DELETE', url: '/'+doc.feed.id, fields: {delete: true}}, {end:function(){}, data:function(newFeedData){
                },writeHead:function(){}});
            } else if(doc.id) {
                var feedQuery = {"ref": {"col": "comments", "id": doc.id}};
                ds.find('feed', feedQuery, function(err, data) {
                    _.each(data, function(e) {
                        var docId = e.id;
                        house.io.rooms.in('feed').emit('deletedFeed', docId);
                    });
                    ds.remove('feed', feedQuery, function(err, data) {
                    });
                });
            }
        }
        
        var getSessionUserTwitterSession = function(callback) {
            // if(req.session.data && req.session.data.auth) {
            //     console.log(req.session.data.auth["twitter_oauth_token_secret"]);
            //     console.log(req.session.data.auth["twitter_oauth_token"]);
            // }
            if(req.session.data && req.session.data.user) {
                ds.find(usersCol, {_id: req.session.data.user}, function(err, data) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        if(data.length > 0) {
                            var user = _.first(data);
                            
                            if(user.twitterSession) {
                                callback(null, user.twitterSession);
                            } else {
                                callback(new Error("no twitter session"));
                            }
                        } else {
                            callback(new Error("no user found"));
                        }
                    }
                });
            } else {
                callback(new Error("no user session"));
            }
        }
        
        if(req.method == 'GET') {
            
            getSessionUserTwitterSession(function(err, twitterSession){
                if(err) {
                    house.log.err(err);
                    res.data({});
                } else {
                    if(twitterSession && twitterSession.hasOwnProperty('token') && twitterSession.hasOwnProperty('secret')) {
                        
                        console.log(path);
                        
                        if(path.indexOf('userstream') === 0) {
                            var twitterUserStream = new TwitterUserStream({
                                consumer_key: options.twitter.key,
                                consumer_secret: options.twitter.secret,
                                access_token_key: twitterSession.token,
                                access_token_secret: twitterSession.secret
                            });
                            
                            //create stream
                            twitterUserStream.stream();
                            twitterUserStream.on('garbage', function(garbage) {
                                house.log.debug('twitterUserStream-garbage');
                                house.log.debug(garbage);
                            });
                            twitterUserStream.on('error', function(err) {
                                house.log.debug('twitterUserStream-err');
                                house.log.err(err);
                            });
                            twitterUserStream.on('connected', function() {
                                house.log.debug('twitterUserStream-connected');
                            });
                            twitterUserStream.on('heartbeat', function() {
                                house.log.debug('twitterUserStream-heartbeat');
                            });
                            //listen stream data
                            twitterUserStream.on('data', function(json) {
                                house.log.debug('twitterUserStream-data')
                                
                                if(json.hasOwnProperty('event')) {
                                    var eventName = json.event;
                                    if(eventName === 'follow') {
                                        //
                                        if(json.hasOwnProperty('source') && json.hasOwnProperty('target')) {
                                            var twitterUser = json.source;
                                            var twitterFriend = json.target;
                                            
                                            // TODO check to make sure the source user is of this session. if()
                                            postTwitterFriend(req.session, twitterFriend, function(){
                                                house.log.debug('twitter friend posted');
                                            });
                                        }
                                    } else if(eventName === 'unfollow') {
                                        if(json.hasOwnProperty('source') && json.hasOwnProperty('target')) {
                                            var twitterUser = json.source;
                                            var twitterFriend = json.target;
                                            deleteTwitterFriend(req.session, twitterFriend, function(){
                                                house.log.debug('twitter friend deleted');
                                            });
                                        }
                                    } else if(json.hasOwnProperty('text') && json.hasOwnProperty('id_str')) {
                                        saveTweet(req.session, json);
                                    }
                                } else if(json.hasOwnProperty('friends')) {
                                    var friendsArr = json.friends;
                                    for(var f in friendsArr) {
                                        var friendId = friendsArr[f];
                                        //
                                    }
                                } else {
                                    house.log.debug(json);
                                }
                            });
                        } else {
                        
                            var url = baseUrl+path.substr(1);
                            console.log('get twitter api url: '+url);
                            
                            oaGetUrlWithSession(url, twitterSession, function(err, data){
                                if(err) {
                                    house.log.err(err);
                                    res.data({});
                                } else {
                                    res.data(data);
                                }
                            });
                        }
                    }
                }
            });
            //'friends/list.json?cursor=' + cursor + '&count=200&skip_status=true&include_user_entities=true&screen_name='+twitterUser.screen_name
            return;
            
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
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            house.log.debug('post comment');
            if(path == '') {
                var newDoc = req.fields;
                newDoc.at = new Date();
                newDoc.user = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                ds.insert(col, newDoc, function(err, data){
                    house.log.debug('inserted new review')
                    house.log.debug(data)
                    var respondWithFind = function(docId) {
                        var query = {_id: docId};
                        ds.find(col, query, function(err, docs) {
                            if (err) {
                                house.log.err(err);
                            } else {
                                var resWithDoc = _.first(docs);
                                insertDocToFeed(resWithDoc, function(feedDocs){
                                    resWithDoc = filterData(resWithDoc);
                                    res.data(resWithDoc);
                                    emitToRoomIn(col, 'inserted', resWithDoc);
                                });
                            }
                        });
                    }
                    if(err) {
                        house.log.err(err);
                    } else if(data) {
                        incUserReviews(req.session.data.user, 1);
                        respondWithFind(data.id);
                    }
                });
            }
        } else if(req.method == 'PUT') {
            if(!req.session.data.user) {
                res.writeHead(403);
                res.end('{}');
                return;
            }
            var query = {};
            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {
                
            } else {
                query['user.id'] = req.session.data.user;
            }
            
            if(docId) {
                query._id = docId;
                var putDoc = req.fields;
                var updateGroups = false;
                var insertToFeed = false;
                var removeFromFeed = false;
                for(var k in putDoc) {
                    if(putDoc.hasOwnProperty(k) && k.substr(0,1) == '$') {
                        for(var colName in putDoc[k]) {
                            if(colName == 'groups') {
                                updateGroups = true;
                            }
                            if(colName == 'user') {
                                
                            }
                            if(k == "$set" && colName == 'feed') {
                                insertToFeed = true;
                            } else if(k == "$unset" && colName == 'feed') {
                                removeFromFeed = true;
                            }
                        }
                    }
                }
                var doProc = false;
                if(putDoc.hasOwnProperty('$set') && putDoc["$set"].hasOwnProperty('proc')) {
                    doProc = true;
                }
                ds.update(col, query, putDoc, function(err, data){
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        house.log.debug(data);
                        
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            house.log.debug(data);
                            var postDoc = {url: putDoc['$set']['url']};
                            if(updatedDoc.hasOwnProperty('groups')) {
                                postDoc.groups = updatedDoc.groups;
                            }
                            if(updateGroups) {
                            }
                            var putRespond = function(data) {
                                if(insertToFeed) {
                                    insertDocToFeed(updatedDoc, function(feedDocs){
                                        var resWithDoc = updatedDoc;
                                        resWithDoc.feed = {id: feedDocs.id, at: feedDocs.at};
                                        res.data(resWithDoc);
                                        emitToRoomIn(col, 'updated', resWithDoc);
                                    });
                                } else if (updatedDoc.hasOwnProperty('feed')) {
                                    updateDocInFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoomIn(col, 'updated', updatedDoc);
                                } else if (removeFromFeed) {
                                    removeDocFromFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoomIn(col, 'updated', updatedDoc);
                                } else {
                                    data = filterData(data);
                                    res.data(data);
                                    emitToRoomIn(col, 'updated', data);
                                }
                            }
                            if(doProc) {
                                //processUrls(data, function(err, data){
                                    putRespond(data);
                                //});
                            } else {
                                putRespond(data);
                            }
                        });
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
                query['user.id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    // incUserTags(req.session.data.user, -1);
                    // removeDocFromFeed(doc);
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
