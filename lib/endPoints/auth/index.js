//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;
var crypto = require('crypto');
var oauth = require('oauth');
var OAuth = oauth.OAuth;
var OAuthTwo = oauth.OAuth2;
var email = require("emailjs-plus/email");
var moment = require("moment");

(exports = module.exports = function(house, options) {
    var subsCol = options.collectionSubs || 'subs';
    var contactsCol = options.collectionContacts || 'contacts';

    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var siteUrl = house.config.site.url;
    var startingQuota = 2400000000; // ~ 2GB
    if(house.config.email) {
        var emailServer = email.server.connect({
            user: house.config.email.user,
            password: house.config.email.pass,
            host: house.config.email.smtp,
            ssl: house.config.email.ssl
        });
    }
    
    var sendResetLinkTxtTo = function(txt, to, callback) {
        if(!emailServer) {
            house.log.debug('no email config to send with');
            return;
        }
        var sendEmailOpts = {
            text: txt,
            from: '<' + house.config.email.user + '>',
            to: '<' + to + '>',
            subject: "reset your password",
        }

        if(house.config.site.owner) {
            sendEmailOpts.from = house.config.site.owner.name + ' <' + house.config.site.owner.email + '>';
        }

        house.log.debug('send email')
        emailServer.send(sendEmailOpts, function(err, message) {
            house.log.debug(err || message);
            // res.data(message);
            if(callback) {
                callback(err, message);
            }
        });
    }

    var sendRegToAdmin = function(txt) {
        if(!emailServer) {
            house.log.debug('no email config to send with');
            return;
        }
        var sendEmailOpts = {
            text: txt,
            from: '<' + house.config.email.user + '>',
            to: '<' + house.config.email.user + '>',
            subject: "new user",
        }

        if(house.config.site.owner) {
            sendEmailOpts.from = house.config.site.owner.name + ' <' + house.config.site.owner.email + '>';
        }

        house.log.debug('send email to notify of new user');
        emailServer.send(sendEmailOpts, function(err, message) {
            house.log.debug(err || message);
            res.data(message);
        });
    }

    var hashPass = function(pass) {
        var passHash = crypto.createHash('sha512');
        passHash.update(pass);
        return passHash.digest('hex');
    }


    var handleReq = function(req, res, next) {

        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;

        var secureReq = function() {
            if(!req.isSecure) {
                var reqPath = req.url; // '/api/auth'
                house.log.info('insecure connection to auth endpoint, redirect to /api/auth/'+path);
                house.utils.response.redirect(res, 'https://' + req.headers.host + '/api/auth/'+path);
                return false;
            }
            return true;
        }
        var findUser = function(query) {
            ds.find(col, query, function(err, data) {
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
        var updateSessionUserWithDoc = function(updateDoc, callback) {
            if(!req.session.data.user) {
                house.log.err('cant update session without user');
                return;
            }
            house.log.debug('update user with doc');
            house.log.debug(updateDoc);
            ds.update(col, {
                "_id": req.session.data.user
            }, updateDoc, function(err, docs) {
                if(err) {
                    house.log.err(err);
                    if(callback) {
                        callback(err);
                    }
                } else {
                    if(callback) {
                        callback(null, docs);
                    }
                }
            });
        }

        if(req.method == 'GET') {
            var query = {};

            if(path === '' || path === '/') {
                // require ssl
                if(!secureReq(req)) {
                    return;
                }
                res.data(req.session.data);
            } else if(path.indexOf('/reset') === 0) {
                // require ssl
                if(!secureReq(req)) {
                    return;
                }
                house.log.info('auth login for user reset password');
                console.log(req.query)
                ds.find(col, {
                    "tmpPass.hash": req.query.pass
                }, function(err, data) {
                    if(err) {
                        house.log.err(err);
                        res.setHeaderAccessControl();
                        res.end('error');
                    } else if(data.length > 0) {
                        var userData = _(data).first();
                        console.log(userData.tmpPass.expiresAt);
                        console.log(userData);
                        var now = new Date();
                        if(userData.tmpPass.expiresAt > now) {
                            ds.update(col, {
                                _id: userData.id
                            }, {
                                $unset: {
                                    tmpPass: true
                                }
                            }, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                } else if(data) {
                                    req.authorizeUser(userData, function() {
                                        var loc = req.query.redirect || house.config.site.url;
                                        res.setHeaderAccessControl();
                                        res.writeHead(302, {
                                            'Location': loc
                                        });
                                        res.end();
                                    });
                                }
                            });
                        } else {
                            res.setHeaderAccessControl();
                            res.end('expired');
                        }
                    } else {
                        house.log.err(err);
                        res.setHeaderAccessControl();
                        res.end('error');
                    }
                });
            } else if(path.indexOf('/twitter') === 0) {
                var oa = getTwitterOAuth();
                var parsedUrl = req.urlParsed;
                // parsedUrl.query.oauth_token
                // parsedUrl.query.oauth_verifier
                if(parsedUrl.query && parsedUrl.query.oauth_token && req.session.data.auth["twitter_oauth_token_secret"]) {
                    oa.getOAuthAccessToken(parsedUrl.query.oauth_token, req.session.data.auth["twitter_oauth_token_secret"], parsedUrl.query.oauth_verifier,
                        function(error, oauth_token, oauth_token_secret, additionalParameters) {
                            if(error) {
                                house.log.err(error);
                                //resObj['error'] = error.Message;
                                //writeJsonResponse(res, resObj, jsoncallback);
                            } else {
                                var showUserById = function(user_id, callback) {
                                    var usersShowUrl = 'https://api.twitter.com/1.1/users/show.json?stringify_ids=true&user_id=' + user_id;
                                    oa.get(usersShowUrl, oauth_token, oauth_token_secret, function(err, data) {
                                        if(err) {
                                            house.log.err(err);
                                            callback(err);
                                        } else {
                                            house.log.debug('tweeter user')
                                            if(data) {
                                                data = JSON.parse(data);
                                                callback(null, data);
                                            }
                                        }
                                    });
                                }
                                //house.log.debug('additionalParameters');
                                //house.log.debug(additionalParameters);
                                req.session.data.auth["twitter_oauth_token_secret"] = oauth_token_secret;
                                req.session.data.auth["twitter_oauth_token"] = oauth_token;
                                
                                var twitterSession = {
                                    uid: additionalParameters.user_id,
                                    name: additionalParameters.screen_name,
                                    token: oauth_token,
                                    secret: oauth_token_secret
                                }

                                var redirectTwitterUrl = function(twitterUser) {
                                    var postContactDoc = function(doc, callback) {
                                        var contactsEndPoint = house.api.getEndPointByName(contactsCol);
                                        contactsEndPoint({
                                            session: req.session,
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
                                    var postSubDoc = function(doc, callback) {
                                        // POST sub
                                        var subsEndPoint = house.api.getEndPointByName(subsCol);
                                        subsEndPoint({
                                            session: req.session,
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
                                    if(twitterUser) {
                                        console.log(twitterUser);
                                        console.log(twitterUser.screen_name);
                                    }
                                    // 
                                    house.log.debug('--------grab twitter info');
                                    // post twitter user as contact
                                    // get following list for user
                                    // for each following user
                                    //  post user to contacts
                                    //  post sub with url: twitter.com/username, src: twitter
                                    //    which in turn posts a URL
                                    //      while parsing the URL - get tweets as articles//
                                    var newContact = {
                                        twitter: twitterUser
                                    }
                                    postContactDoc(newContact, function(err, data) {
                                        if(err) {
                                            house.log.err(err);
                                        } else {
                                            updateSessionUserWithDoc({"$set": {"contact_id": data.id}});
                                        }
                                    });
                                    
                                    var procTwitterUserAsFriendOf = function(twitterFriend, twitterUser, callback) {
                                        var newContact = {
                                            twitter: twitterFriend
                                        }
                                        postContactDoc(newContact, function(err, data) {
                                            if(err) {
                                                house.log.err(err);
                                            } else {
                                                house.log.debug('posted twitter friend as contact')
                                                
                                                var newSub = {
                                                    url: 'https://twitter.com/'+twitterFriend.screen_name,
                                                    twitterUser: twitterFriend,
                                                    source: "twitter"
                                                }
                                                postSubDoc(newSub, function(err, data) {
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
                                    
                                    var getTwitterUserFriends = function(callback) {
                                        var oa = getTwitterOAuth();
                                        var friendsList = {};
                                        
                                        var isProcessing = false;
                                        var procStack = [];
                                        var doProcTwitterUserAsFriendOf = function(user, twitterUser) {
                                            procStack.push({user: user, twitterUser: twitterUser});
                                            if(isProcessing) {
                                                return;
                                            }
                                            isProcessing = true;
                                            var procNext = function() {
                                                if(procStack.length > 0) {
                                                    var p = procStack.shift();
                                                    procTwitterUserAsFriendOf(p.user, p.twitterUser, function(){
                                                        if(procStack.length > 0) {
                                                            procNext();
                                                        } else {
                                                            isProcessing = false;
                                                        }
                                                    });
                                                } else {
                                                    isProcessing = false;
                                                }
                                            }
                                            procNext();
                                        }
                                        
                                        var oaGet = function(cursor) {
                                            var url = 'https://api.twitter.com/1.1/friends/list.json?cursor=' + cursor + '&count=200&skip_status=true&include_user_entities=true&screen_name='+twitterUser.screen_name
                                            house.log.debug('getTwitterUserFriends oaGet cursor: '+cursor);
                                            house.log.debug(url);
                                            oa.get(url, twitterSession.token, twitterSession.secret, function (e, data, res) {
                                                if (e) console.error(e);
                                                var jsonData = JSON.parse(data);
                                                if(jsonData.users) {
                                                    var nextCursor = jsonData.next_cursor;
                                                    jsonData.users.forEach(function(user){
                                                      var name = user.name;
                                                      friendsList[name + ""] = user;
                                                      
                                                      doProcTwitterUserAsFriendOf(user, twitterUser);
                                                    });
                                                    // callback(cursor); 
                                                    if (nextCursor != 0) {
                                                        var delayTime = 1000 * 61; // 1 call per minute
                                                        setTimeout(function(){
                                                            oaGet(nextCursor);
                                                        }, delayTime);
                                                    } else {
                                                        house.log.debug('done grabbing friends');
                                                        // console.log(friendsList);
                                                        if(callback) {
                                                            callback(friendsList);
                                                        }
                                                    }
                                                } else {
                                                    if(jsonData.statusCode === 429) {
                                                        house.log.debug('err with jsonData');
                                                        house.log.debug(jsonData);
                                                        if(callback) {
                                                            callback(null);
                                                        }
                                                    } else {
                                                        // console.log(jsonData);
                                                        if(callback) {
                                                            if(friendsList) {
                                                                callback(friendsList);
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        oaGet(-1);
                                    }
                                    getTwitterUserFriends(function(friendsList){
                                        var procNextFriend = function() {
                                            if(friendsList) {
                                                house.log.debug('procNextFriend : '+friendsList.length);
                                                if(friendsList.length > 0) {
                                                    procNextFriend();
                                                }
                                            }
                                        }
                                        procNextFriend();
                                    });
                                    
                                    /*var twitterOauthTwo = getTwitterOAuthTwo();
                                    twitterOauthTwo.getOAuthAccessToken('', {'grant_type': 'client_credentials' }, function (e, access_token) {
                                        if(e) {
                                            house.log.err(e);
                                        }
                                        var twitterRequestOptions = {
                                            hostname: 'api.twitter.com',
                                            path: '/1.1/statuses/user_timeline.json?screen_name='+twitterUser.screen_name,
                                            headers: {
                                                Authorization: 'Bearer ' + access_token
                                            }
                                        };
                                        https.get(twitterRequestOptions, function(result){
                                            var buffer='';
                                            result.setEncoding('utf8');
                                            result.on('data', function(data){
                                                buffer += data;
                                            });
                                            result.on('end', function(){
                                                try{
                                                    // feeds.twitter = JSON.parse(buffer);
                                                    console.log(JSON.parse(buffer));
                                                }catch(err){
                                                    house.log.err(err);
                                                }
                                            });
                                        });
                                    });*/
                                    
                                    
                                    
                                    res.setHeaderAccessControl();
                                    res.writeHead(302, {
                                        'Location': req.session.data['twitter_redirect_url']
                                    });
                                    res.end();
                                }

                                //var twitterAvatar = 'https://api.twitter.com/1.1/users/profile_image?screen_name='+additionalParameters.screen_name+'&size=original';
                                var getRedirectDestFromUrl = function(getUrl, callback) {
                                    if(!getUrl) {
                                        callback(getUrl);
                                    }
                                    if(getUrl.indexOf('https') === 0) {
                                        https.get(getUrl, function(res) {
                                            var destUrl = getUrl;
                                            if((res.statusCode == 301 || res.statusCode == 302) && res.headers.location) {
                                                if(url.parse(res.headers.location).hostname) {
                                                    destUrl = res.headers.location;
                                                } else {
                                                    destUrl = url.parse(res.headers.location).hostname + res.headers.location;
                                                }
                                            } else {}
                                            callback(destUrl);
                                        }).on('error', function(e) {
                                            console.error(e);
                                            callback(getUrl);
                                        });
                                    } else {
                                        http.get(getUrl, function(res) {
                                            var destUrl = getUrl;
                                            if((res.statusCode == 301 || res.statusCode == 302) && res.headers.location) {
                                                if(url.parse(res.headers.location).hostname) {
                                                    destUrl = res.headers.location;
                                                } else {
                                                    destUrl = url.parse(res.headers.location).hostname + res.headers.location;
                                                }
                                            } else {}
                                            callback(destUrl);
                                        }).on('error', function(e) {
                                            console.error(e);
                                            callback(getUrl);
                                        });
                                    }
                                }

                                var updatedObject = {
                                    "$set": {
                                        "twitterSession": twitterSession
                                    }
                                }; // , 'avatar': twitterAvatar

                                req.session.data.auth.twitter = twitterSession;

                                showUserById(additionalParameters.user_id, function(err, twitterUser) {
                                    if(err) {
                                        house.log.err(err);
                                    } else if(twitterUser) {
                                        console.log(twitterUser);
                                        updatedObject["$set"].twitterUser = twitterUser;
                                        updatedObject["$set"].name = '@' + twitterUser.screen_name;
                                        updatedObject["$set"].displayName = twitterUser.name;

                                        getRedirectDestFromUrl(twitterUser.url, function(twitterUserUrl) {

                                            if(twitterUserUrl) {
                                                updatedObject["$set"].url = twitterUserUrl;
                                            }
                                            updatedObject["$set"].location = twitterUser.location;
                                            updatedObject["$set"].bio = twitterUser.description;

                                            if(twitterUser.profile_image_url_https) {
                                                updatedObject["$set"].avatar = twitterUser.profile_image_url_https;
                                            } else if(twitterUser.profile_image_url) {
                                                updatedObject["$set"].avatar = twitterUser.profile_image_url;
                                            }

                                            // lookup to see if you 've connected before
                                            var query = {
                                                "twitterSession.uid": additionalParameters.user_id
                                            };
                                            ds.find(col, query, function(err, data) {
                                                if(err) {
                                                    house.log.err(err);
                                                } else if(data) {
                                                    if(data.length === 0) {
                                                        // Offer to login, or register
                                                        if(req.session.data.user) {
                                                            // already logged in, lets connect to twitter
                                                            house.log.info('connect logged in user to twitter: ' + req.session.data.user)

                                                            ds.update(col, {
                                                                "name": req.session.data.user
                                                            }, updatedObject, function(err, docs) {
                                                                if(err) {
                                                                    house.log.err(err);
                                                                } else {
                                                                    house.log.debug(docs);
                                                                }
                                                                redirectTwitterUrl(twitterUser);
                                                            });
                                                        } else {
                                                            var newUserDoc = updatedObject["$set"];
                                                            newUserDoc.groups = [];
                                                            newUserDoc.fileQuota = startingQuota;

                                                            ds.insert(col, newUserDoc, function(err, user) {
                                                                if(err) {
                                                                    house.log.err(err);
                                                                    res.setHeaderAccessControl();
                                                                    res.end('error');
                                                                } else {
                                                                    if(_.isArray(user)) {
                                                                        user = _(user).first();
                                                                    }
                                                                    house.log.debug('new twitter user reg')
                                                                    house.log.debug(user);
                                                                    req.authorizeUser(user, function() {
                                                                        redirectTwitterUrl(twitterUser);
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    } else {
                                                        var user = data;
                                                        if(_.isArray(user)) {
                                                            user = _(user).first();
                                                        }
                                                        house.log.debug(user);
                                                        house.log.debug('found twitter user with document')
                                                        house.log.debug({
                                                            "_id": user.id
                                                        })
                                                        house.log.debug(updatedObject)
                                                        ds.update(col, {
                                                            "_id": user.id
                                                        }, updatedObject, function(err, docs) {
                                                            if(err) house.log.err(err);
                                                        });
                                                        // login user
                                                        req.authorizeUser(user, function() {
                                                            redirectTwitterUrl(twitterUser);
                                                        });
                                                    }

                                                } else {
                                                    house.log.err(new Error('no data from mongo'));
                                                }
                                            });
                                        });
                                    } else {
                                        house.log.err('no data');
                                    }
                                    //});
                                });
                            }
                        });
                } else {
                    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters) {
                        //console.log(additionalParameters) // { oauth_callback_confirmed: 'true' }
                        if(error) {
                            house.log.err(error);
                        } else {
                            req.session.data.auth = {
                                "twitter_oauth_token_secret": oauth_token_secret,
                                "twitter_oauth_token": oauth_token
                            };
                            req.session.data['twitter_redirect_url'] = req.headers.referer;
                            res.setHeaderAccessControl();
                            res.writeHead(302, {
                                'Location': "https://twitter.com/oauth/authenticate?oauth_token=" + oauth_token
                            });
                            res.end();
                        }
                    });
                }
            } else if(path.indexOf('/facebook') === 0) {
                var fbOAuth = getFacebookOAuth();
                var fbRedirectUri = options.facebook.callback;
                var fbScope = 'email';
                var parsedUrl = req.urlParsed;

                var redirectFacebookUrl = function() {
                    res.setHeaderAccessControl();
                    res.writeHead(302, {
                        'Location': req.session.data['facebook_redirect_url']
                    });
                    res.end();
                }

                if(parsedUrl.query && (parsedUrl.query.code || parsedUrl.query.error_reason === 'user_denied')) {
                    console.log('fb code');
                    if(parsedUrl.query.error_reason == 'user_denied') {
                        house.log.err('facebook user denied');
                        redirectFacebookUrl();
                    } else {
                        fbOAuth.getOAuthAccessToken(parsedUrl.query && parsedUrl.query.code, {
                            redirect_uri: fbRedirectUri
                        }, function(error, access_token, refresh_token) {
                            if(error) {
                                console.log(error);
                                house.log.err(error);
                            } else {
                                req.session.data["access_token"] = access_token;
                                if(refresh_token) req.session.data["refresh_token"] = refresh_token;
                                var meFields = '?fields=id,name,first_name,last_name,link,username,location,gender,timezone,locale,verified,updated_time,picture,email';
                                fbOAuth.getProtectedResource("https://graph.facebook.com/me" + meFields, access_token, function(error, data, response) {
                                    var profile = JSON.parse(data);
                                    console.log(profile);
                                    var avatar = ''; // https://graph.facebook.com/jeffpelton/picture?type=large
                                    if(profile.hasOwnProperty('picture')) {
                                        if(profile.picture.hasOwnProperty('data') && profile.picture.data.hasOwnProperty('url')) {
                                            avatar = profile.picture.data.url;
                                        } else {
                                            avatar = profile.picture + '?type=large';
                                        }
                                    } else {}
                                    // this is better than the crap that comes back from profile.picture
                                    avatar = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';

                                    var fbSession = {
                                        "uid": profile.id,
                                        "accessToken": access_token
                                    };
                                    var updatedObject = {
                                        "$set": {
                                            "fbSession": fbSession,
                                            'avatar': avatar,
                                            "fbProfile": profile
                                        }
                                    };

                                    // lookup to see if you 've connected before
                                    var query = {
                                        "fbSession.uid": profile.id
                                    };

                                    ds.find(col, query, function(err, data) {
                                        if(err) {
                                            house.log.err(err);
                                        } else if(data) {
                                            if(data.length === 0) {
                                                // Offer to login, or register
                                                if(req.session.data.user) {
                                                    // already logged in, lets connect to twitter
                                                    house.log.info('connect logged in user to facebook: ' + req.session.data.user)

                                                    ds.update(col, {
                                                        "name": req.session.data.user
                                                    }, updatedObject, function(err, docs) {
                                                        if(err) {
                                                            house.log.err(err);
                                                        } else {
                                                            house.log.debug(docs);
                                                        }
                                                        redirectFacebookUrl();
                                                    });
                                                } else {
                                                    // REGISTER
                                                    var newUserDoc = {
                                                        "name": profile.name,
                                                        "displayName": profile.name,
                                                        "groups": [],
                                                        "fileQuota": startingQuota,
                                                        "fbSession": {
                                                            "uid": profile.id,
                                                            "accessToken": access_token
                                                        }
                                                    };

                                                    if(profile.hasOwnProperty('username')) {
                                                        newUserDoc.name = profile.username;
                                                    }

                                                    if(profile.hasOwnProperty('email')) {
                                                        newUserDoc.email = profile.email;
                                                    }

                                                    newUserDoc.avatar = avatar;

                                                    ds.insert(col, newUserDoc, function(err, user) {
                                                        if(err) {
                                                            house.log.err(err);
                                                            res.setHeaderAccessControl();
                                                            res.end('error');
                                                        } else {
                                                            if(_.isArray(user)) {
                                                                user = _(user).first();
                                                            }
                                                            house.log.debug('new facebook user reg')
                                                            house.log.debug(user);
                                                            req.authorizeUser(user, function() {
                                                                redirectFacebookUrl();
                                                            });
                                                        }
                                                    });
                                                }
                                            } else {
                                                var user = _.first(data);
                                                house.log.debug(user);
                                                house.log.debug('found facebook user with document')
                                                house.log.debug({
                                                    "_id": user.id
                                                })
                                                house.log.debug(updatedObject)
                                                ds.update(col, {
                                                    "_id": user.id
                                                }, updatedObject, function(err, docs) {
                                                    if(err) house.log.err(err);
                                                });
                                                // login user
                                                req.authorizeUser(user, function() {
                                                    redirectFacebookUrl();
                                                });
                                            }
                                        } else {
                                            house.log.err(new Error('no data from mongo facebook find user'));
                                        }
                                    });
                                });
                            }
                        });
                    }
                } else {
                    req.session.data['facebook_redirect_url'] = req.headers.referer;
                    var redirectUrl = fbOAuth.getAuthorizeUrl({
                        redirect_uri: fbRedirectUri,
                        scope: fbScope,
                        display: 'page'
                    })
                    res.setHeaderAccessControl();
                    res.writeHead(302, {
                        'Location': redirectUrl
                    });
                    res.end();
                }
            } else if(path.indexOf('/google') === 0) {
                //http://www.google.com/reader/subscriptions/export?hl=en

                var redirectResponseThreeOhThree = function(error, authenticated) {
                    res.setHeaderAccessControl();
                    res.writeHead(303, {
                        'Location': req.session.data.google2_redirect_url
                    });
                    res.end('');
                }
                var redirectUri = options.google.client.callback;
                var googleOA = getGoogleOAuth();
                var googleScope = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.google.com/reader/api";

                var parsedUrl = url.parse(req.url, true);
                console.log(parsedUrl);

                var google2_failed = function(callback) {
                    req.session.data['google2_login_attempt_failed'] = true;
                }

                if(req.session.data['google2_login_attempt_failed'] === true) {
                    // Because we bounce through authentication calls across multiple requests
                    // we use this to keep track of the fact we *Really* have failed to authenticate
                    // so that we don't keep re-trying to authenticate forever.
                    delete req.session.data['google2_login_attempt_failed'];
                } else {
                    if(parsedUrl.query && (parsedUrl.query.code || parsedUrl.query.error === 'access_denied')) {
                        if(parsedUrl.query.error == 'access_denied') {
                            house.log.debug('User denied OAuth Access');
                            google2_failed(callback);
                        } else {
                            house.log.debug('Phase 2/2 : Requesting an OAuth access token.');
                            googleOA.getOAuthAccessToken(parsedUrl.query.code, {
                                redirect_uri: redirectUri,
                                grant_type: 'authorization_code'
                            }, function(error, access_token, refresh_token) {
                                if(error) {
                                    log.err('Error retrieving the OAuth Access Token: ' + error);
                                    callback(error)
                                } else {
                                    req.session.data["google2_access_token"] = access_token;
                                    if(refresh_token) req.session.data["google2_refresh_token"] = refresh_token;

                                    googleOA.get("https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
                                        access_token,
                                        function(error, profileData) {
                                            if(error) {
                                                house.log.err('Error retrieving the profile data =>' + JSON.stringify(error));
                                                google2_failed(callback);
                                            } else {
                                                var profile = JSON.parse(profileData);
                                                house.log.debug(profile);
                                                req.session.data.auth.google = profile;

                                                var googleSession = profile;
                                                googleSession.accessToken = access_token;
                                                var updatedObject = {
                                                    "$set": {
                                                        "googleSession": googleSession
                                                    }
                                                };

                                                // lookup to see if you 've connected before
                                                var query = {
                                                    "googleSession.id": profile.id
                                                };

                                                //{ id: '115655245830834272083', email: 'jeff.pelton@gmail.com', verified_email: true, name: 'J Donovan', given_name: 'J', family_name: 'Donovan' }
                                                // see if this is an existing user or wanting to register

                                                var redirectGoogleUrl = function() {
                                                    res.setHeaderAccessControl();
                                                    res.writeHead(302, {
                                                        'Location': req.session.data['google2_redirect_url']
                                                    });
                                                    res.end();
                                                }
                                                //http://www.google.com/reader/atom/user/10911455515410268525/pref/com.google/subscriptions
                                                //http://www.google.com/reader/subscriptions/export
                                                var getSubs = function(user) {
                                                    googleOA.get("https://www.google.com/reader/api/0/subscription/list?output=json",
                                                        access_token,
                                                        function(error, subsData) {
                                                            if(error) {
                                                                house.log.err('Error retrieving subscriptions data =>' + JSON.stringify(error));
                                                            } else {
                                                                //house.log.debug(subsData);
                                                                try {
                                                                    var jsubs = JSON.parse(subsData);
                                                                    //jsubs
                                                                    house.log.debug(jsubs);

                                                                    var procSubsStack = function() {
                                                                        house.log.debug('subs left to proc: ' + jsubs.subscriptions.length);
                                                                        if(jsubs.subscriptions.length == 0) {
                                                                            return false;
                                                                        }
                                                                        var readerSubscription = jsubs.subscriptions.pop();

                                                                        var subUrl = readerSubscription.id.substr(readerSubscription.id.indexOf('feed/') + 5);
                                                                        var newSub = {
                                                                            url: subUrl,
                                                                            g: readerSubscription
                                                                        }
                                                                        var subsEndPoint = house.api.getEndPointByName(subsCol);
                                                                        subsEndPoint({
                                                                            session: req.session,
                                                                            method: 'POST',
                                                                            url: '',
                                                                            fields: newSub
                                                                        }, {
                                                                            end: function() {},
                                                                            data: function(newSubData) {
                                                                                if(_.isArray(newSubData)) {
                                                                                    newSubData = _.first(newSubData);
                                                                                }
                                                                                console.log(newSubData);
                                                                                if(jsubs.subscriptions.length > 0) {
                                                                                    procSubsStack();
                                                                                }
                                                                            },
                                                                            writeHead: function() {}
                                                                        });
                                                                    }

                                                                    if(jsubs.hasOwnProperty('subscriptions')) {
                                                                        procSubsStack();
                                                                    }

                                                                    return;
                                                                    ////
                                                                    if(jsubs.hasOwnProperty('subscriptions')) {
                                                                        for(var i in jsubs.subscriptions) {
                                                                            var readerSubscription = jsubs.subscriptions[i];
                                                                            var subUrl = readerSubscription.id.substr(readerSubscription.id.indexOf('feed/') + 5);
                                                                            var newSub = {
                                                                                url: subUrl,
                                                                                g: readerSubscription
                                                                            }
                                                                            var subsEndPoint = house.api.getEndPointByName(subsCol);
                                                                            subsEndPoint({
                                                                                session: req.session,
                                                                                method: 'POST',
                                                                                url: '',
                                                                                fields: newSub
                                                                            }, {
                                                                                end: function() {},
                                                                                data: function(newSubData) {
                                                                                    if(_.isArray(newSubData)) {
                                                                                        newSubData = _.first(newSubData);
                                                                                    }
                                                                                    console.log(newSubData);
                                                                                },
                                                                                writeHead: function() {}
                                                                            });
                                                                        }
                                                                    }
                                                                    return;
                                                                } catch(err) {
                                                                    house.log.err(err);
                                                                }
                                                            }
                                                        });
                                                }


                                                ds.find(col, query, function(err, data) {
                                                    if(err) {
                                                        house.log.err(err);
                                                    } else if(data) {
                                                        if(data.length === 0) {
                                                            // Offer to login, or register
                                                            if(req.session.data.user) {
                                                                ds.update(col, query, updatedObject, function() {
                                                                    house.log.debug('updated user with google session');
                                                                });
                                                            } else {
                                                                // REGISTER
                                                                var newUserDoc = {
                                                                    "name": profile.name,
                                                                    "displayName": profile.name,
                                                                    "groups": [],
                                                                    "fileQuota": startingQuota,
                                                                    "googleSession": googleSession
                                                                };

                                                                if(profile.hasOwnProperty('email')) {
                                                                    newUserDoc.email = profile.email;
                                                                }
                                                                if(profile.hasOwnProperty('picture')) {
                                                                    newUserDoc.avatar = profile.picture;
                                                                }

                                                                ds.insert(col, newUserDoc, function(err, user) {
                                                                    if(err) {
                                                                        house.log.err(err);
                                                                        res.setHeaderAccessControl();
                                                                        res.end('error');
                                                                    } else {
                                                                        if(_.isArray(user)) {
                                                                            user = _(user).first();
                                                                        }
                                                                        house.log.debug('new google user reg')
                                                                        house.log.debug(user);
                                                                        // getSubs();
                                                                        req.authorizeUser(user, function() {
                                                                            redirectGoogleUrl();
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        } else {
                                                            var user = _.first(data);
                                                            house.log.debug(user);
                                                            house.log.debug('found google user with document')
                                                            house.log.debug({
                                                                "_id": user.id
                                                            })
                                                            house.log.debug(updatedObject)
                                                            ds.update(col, {
                                                                "_id": user.id
                                                            }, updatedObject, function(err, docs) {
                                                                if(err) house.log.err(err);
                                                            });
                                                            // login user
                                                            //   getSubs();
                                                            req.authorizeUser(user, function() {
                                                                redirectGoogleUrl();
                                                            });
                                                        }
                                                    }
                                                });
                                            }
                                        });
                                }
                            });
                        }
                    } else {
                        house.log.debug('Phase 1/2 - Redirecting to Google Authorizing url');
                        req.session.data['google2_redirect_url'] = req.headers.referer;
                        req.session.data.auth = {

                        }
                        var redirectUrl = googleOA.getAuthorizeUrl({
                            redirect_uri: redirectUri,
                            scope: googleScope,
                            response_type: 'code'
                        })
                        //self.redirect(response, redirectUrl, callback);
                        res.setHeaderAccessControl();
                        res.writeHead(303, {
                            'Location': redirectUrl
                        });
                        res.end('');
                    }
                }


            } else if(path.indexOf('/linkedin') === 0) {} else if(path.indexOf('/github') === 0) {}


        } else if(req.method == 'POST') {
            house.log.debug('post');

            var getUniqueName = function(name, callback) {
                ds.count(col, {
                    name: name
                }, function(err, length) {
                    if(length > 0) {
                        getUniqueName(name + '1', callback);
                    } else {
                        callback(name);
                    }
                });
            }

            if(path == '') {
                // require ssl
                if(!secureReq(req)) {
                    return;
                }
                if(req.fields.hasOwnProperty('email') && req.fields.hasOwnProperty('resetPass') && req.fields.resetPass) {
                    house.log.info('reset password');
                    var ref = req.headers.referer || house.config.site.url;
                    var resetEmailDoc = {
                        $unset: {
                            pass: true
                        }
                    };

                    var randomStr = Math.random().toString(36).substring(7);
                    var tmpPass = hashPass(randomStr);
                    var ex = moment().add('minutes', 20);

                    resetEmailDoc["$set"] = {
                        tmpPass: {
                            hash: tmpPass,
                            expiresAt: ex.toDate()
                        }
                    }
                    console.log(resetEmailDoc)
                    ds.update(col, {
                        "email": req.fields.email
                    }, resetEmailDoc, function(err, docs) {
                        if(err) {
                            house.log.err(err);
                        } else {
                            house.log.debug(docs);
                            var siteLoginUrl = siteUrl;
                            if(siteLoginUrl.indexOf('https') !== 0) {
                                siteLoginUrl = siteLoginUrl.replace('http', 'https')
                            }
                            var resetUrl = siteLoginUrl + 'api/auth/reset?pass=' + tmpPass + '&redirect=' + encodeURIComponent(ref);
                            var txt = "Visit this link to reset your password: " + resetUrl + " .";
                            sendResetLinkTxtTo(txt, req.fields.email, function(err, message){
                                if(err) {
                                    house.log.err(err);
                                    res.data({});
                                } else {
                                    res.data(message);
                                }
                            });
                        }
                    });

                } else if(req.fields.hasOwnProperty('email') && req.fields.hasOwnProperty('pass') && req.fields.pass && req.fields.pass !== '') {
                    var email = req.fields.email.toLowerCase();
                    var pass = hashPass(req.fields.pass);

                    ds.find(col, {
                        email: email,
                        pass: pass
                    }, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.setHeaderAccessControl();
                            res.end('error');
                            return;
                        }
                        if(data.length === 0) {
                            ds.find(col, {
                                email: email
                            }, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                    res.setHeaderAccessControl();
                                    res.end('error');
                                } else if(data.length === 0) {

                                    var newUserDoc = {
                                        email: email,
                                        pass: pass
                                    };
                                    if(req.fields.name) {
                                        newUserDoc.name = req.fields.name;
                                    } else {
                                        newUserDoc.name = email.substr(0, email.indexOf('@'));
                                    }
                                    getUniqueName(newUserDoc.name, function(name) {
                                        newUserDoc.name = name;

                                        ds.insert(col, newUserDoc, function(err, data) {
                                            if(err) {
                                                house.log.err(err);
                                                res.setHeaderAccessControl();
                                                res.end('error');
                                            } else {
                                                var userData = data;
                                                if(_.isArray(data)) {
                                                    userData = _(data).first();
                                                }
                                                req.authorizeUser(userData, function() {
                                                    res.data(req.session.data);
                                                });
                                            }
                                        });
                                    });
                                } else {
                                    // incorrect password for user
                                    res.setHeaderAccessControl();
                                    res.setHeader('Content-Type', 'application/json');
                                    res.writeHead(403);
                                    res.end('{}');
                                }
                            });
                        } else {
                            var userData = data;
                            if(_.isArray(data)) {
                                userData = _(data).first();
                            }
                            req.authorizeUser(userData, function() {
                                res.data(req.session.data);
                            });
                        }
                    });
                } else if(req.fields.hasOwnProperty('email')) {
                    var email = req.fields.email.toLowerCase();

                    ds.find(col, {
                        email: email
                    }, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.setHeaderAccessControl();
                            res.end('error');
                            return;
                        }
                        if(data.length === 0) {
                            var newUserDoc = {
                                email: email
                            };
                            if(req.fields.name) {
                                newUserDoc.name = req.fields.name;
                            } else {
                                newUserDoc.name = email.substr(0, email.indexOf('@'));
                            }
                            getUniqueName(newUserDoc.name, function(name) {
                                newUserDoc.name = name;
                                ds.insert(col, newUserDoc, function(err, data) {
                                    if(err) {
                                        house.log.err(err);
                                        res.setHeaderAccessControl();
                                        res.end('error');
                                    } else {
                                        var userData = data;
                                        if(_.isArray(data)) {
                                            userData = _(data).first();
                                        }
                                        req.authorizeUser(userData, function() {
                                            res.data(req.session.data);
                                        });
                                    }
                                });
                            });
                        } else {
                            house.log.info('incorrect password from ' + email);
                            res.setHeaderAccessControl();
                            res.setHeader('Content-Type', 'application/json');
                            res.writeHead(403);
                            res.end('{}');
                        }
                    });
                }
            }
        } else if(req.method == 'PUT') {

        } else if(req.method == 'DELETE') {
            req.destroySession(function() {
                res.data({});
            });
        } else if(req.method == 'OPTIONS') {
            res.data({
                x: true
            });
        }
    }

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

    var getFacebookOAuth = function() {
        if(!options.facebook || !options.facebook.app.id || !options.facebook.app.secret) {
            house.log.err(new Error('options.facebook required'));
            return;
        }
        var fbOAuth = new OAuthTwo(options.facebook.app.id, options.facebook.app.secret, "https://graph.facebook.com");
        return fbOAuth;
    }

    var getGoogleOAuth = function() {
        if(!options.google || !options.google.client.id || !options.google.client.secret) {
            house.log.err(new Error('options.google required'));
            return;
        }
        //var fbOAuth = new OAuthTwo(options.google.app.id, options.google.app.secret,  "https://graph.facebook.com");
        var gAuth = new OAuthTwo(options.google.client.id, options.google.client.secret, "", "https://accounts.google.com/o/oauth2/auth", "https://accounts.google.com/o/oauth2/token");
        return gAuth;
    }

    return handleReq;
});