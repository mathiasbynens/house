//
// # Authentication API Endpoint
//

var ObjectID = mongo.ObjectID;
var crypto = require('crypto');
var oauth = require('oauth');
var OAuth = oauth.OAuth;
var OAuthTwo = oauth.OAuth2;

(exports = module.exports = function(house, options){
    
    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;
    var startingQuota = 1000000000; // ~ 1GB
    
    var hashPass = function(pass) {
        var passHash = crypto.createHash('sha512');
        passHash.update(pass);
        return passHash.digest('hex');
    }
    
    var handleReq = function(req, res, next) {
        
        // require ssl
        
        if(!req.isSecure) {
            house.log.info('insecure connection to auth endpoint');
            house.utils.response.redirect(res, 'https://'+req.headers.host+'/api/auth'); 
            return;
        }
        
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var findUser = function(query) {
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
        var findUserId = function(id) {
            var query = {
                id: new ObjectID(id)
            }
            findUser(query);
        }
        
        if(req.method == 'GET') {
            var query = {};
            
            if(path === '' || path === '/') {
                res.data(req.session.data);
            } else if(path.indexOf('/twitter') === 0) {
                var oa = getTwitterOAuth();
                var parsedUrl = req.urlParsed;
                if( parsedUrl.query && parsedUrl.query.oauth_token && req.session.data.auth["twitter_oauth_token_secret"] ) {
                  oa.getOAuthAccessToken(parsedUrl.query.oauth_token, req.session.data.auth["twitter_oauth_token_secret"],
                     function( error, oauth_token, oauth_token_secret, additionalParameters ) {
                       if( error ) {
                		house.log.err(error);
                		//resObj['error'] = error.Message;
                		//writeJsonResponse(res, resObj, jsoncallback);
                	 } else {
                         house.log.debug('additionalParameters');
                		 house.log.debug(additionalParameters);
                         req.session.data.auth["twitter_oauth_token_secret"]= oauth_token_secret;
                         req.session.data.auth["twitter_oauth_token"]= oauth_token;
                         
                         var redirectTwitterUrl = function() {
                              res.writeHead(302, {'Location': req.session.data['twitter_redirect_url']});
                              res.end();
                         }
                         
                        var twitterUser = { 
                		  uid: additionalParameters.user_id,
                		  name: additionalParameters.screen_name,
                              token: oauth_token,
                              secret: oauth_token_secret
                        }
                        var twitterAvatar = 'http://api.twitter.com/1/users/profile_image?screen_name='+additionalParameters.screen_name+'&size=original';
                        var getRedirectDestFromUrl = function(getUrl, callback) {
                            http.get(getUrl, function (res) {
                                var destUrl = getUrl;
                                if((res.statusCode == 301 || res.statusCode == 302) && res.headers.location) {
                                    if (url.parse(res.headers.location).hostname) {
                                          destUrl = res.headers.location;
                                    } else {
                                          destUrl = url.parse(res.headers.location).hostname+res.headers.location;
                                    }
                                } else {
                                }
                                callback(destUrl);
                            }).on('error', function(e) {
                              console.error(e);
                            });
                        }
                        getRedirectDestFromUrl(twitterAvatar, function(twitterAvatar){
                            var updatedObject = {"$set": {"twitterSession": twitterUser, 'avatar': twitterAvatar}};
                              
                        	req.session.data.auth.twitter = twitterUser;
                        	
                        	// lookup to see if you 've connected before
                        	var query = {"twitterSession.uid": additionalParameters.user_id};
                        
                            ds.find(col, query, function(err, data){
                                if(err) {
                                    house.log.err(err);
                                } else if(data) {
                                    
                                    if(data.length === 0) {
                                    
                                    	// Offer to login, or register
                                    	if(req.session.data.user) {
                                    		// already logged in, lets connect to twitter
                                    		house.log.info('connect logged in user to twitter: '+req.session.data.user)
                                    		
                                    		ds.update(col, {"name": req.session.data.user}, updatedObject, function(err, docs) {
                                				if(err) {
                                                    house.log.err(err);
                                				} else {
                                					house.log.debug(docs);
                                				}
                                                redirectTwitterUrl();
                                    		});
                                    	} else {
                                             
                                            ds.insert(col, {"name":'@'+twitterUser.name, "groups":[], "twitterSession": twitterUser, 'avatar': twitterAvatar, 'fileQuota': startingQuota}, function(err, user){
                                                if(err) {
                                                    house.log.err(err);
                                                    res.end('error');
                                                } else {
                                                    if(_.isArray(user)) {
                                                        user = _(user).first();
                                                    }
                                                    house.log.debug('new twitter user reg')
                                                    house.log.debug(user);
                                                    req.authorizeUser(user, function(){
                                                        redirectTwitterUrl();
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
                                      house.log.debug({"_id": user.id})
                                      house.log.debug(updatedObject)
                                        ds.update(col, {"_id": user.id}, updatedObject, function(err, docs) {
                                            if(err) house.log.err(err);
                                        });
                                      // login user
                                        req.authorizeUser(user, function(){
                                            redirectTwitterUrl();
                                        });
                                    }
                                    
                                } else {
                                    house.log.err(new Error('no data from mongo'));
                                }
                            });
                        });
                       }
                     });
                } else {
                  oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, oauth_authorize_url, additionalParameters ) {
                    if(error) {
                      house.log.err(error);
                    } else {
                        req.session.data.auth = {
            				"twitter_oauth_token_secret": oauth_token_secret
            				, "twitter_oauth_token": oauth_token
            			};
            			req.session.data['twitter_redirect_url'] = req.headers.referer;
                 	   res.writeHead(302, {'Location': "https://twitter.com/oauth/authenticate?oauth_token=" + oauth_token});
              		  res.end();
             		}
                  });
                }
            } else if(path.indexOf('/facebook') === 0) {
                var fbOAuth = getFacebookOAuth();
                var fbRedirectUri = options.facebook.callback;
                var fbScope = '';
                var parsedUrl = req.urlParsed;
                
                var redirectFacebookUrl = function() {
                     res.writeHead(302, {'Location': req.session.data['facebook_redirect_url']});
                     res.end();
                }
                
                if( parsedUrl.query && ( parsedUrl.query.code || parsedUrl.query.error_reason === 'user_denied' ) ) {
                    console.log('fb code');
                  if( parsedUrl.query.error_reason == 'user_denied' ) {
                    log.err('facebook user denied');
                  } else {
                    fbOAuth.getOAuthAccessToken(parsedUrl.query && parsedUrl.query.code ,
                         {redirect_uri: fbRedirectUri}, function( error, access_token, refresh_token ){
                           if( error ) {
                               console.log(error);
                               house.log.err(error);
                           } else {
                             req.session.data["access_token"]= access_token;
                             if( refresh_token ) req.session.data["refresh_token"]= refresh_token;
                               var meFields = '?fields=id,name,first_name,last_name,link,username,location,gender,timezone,locale,verified,updated_time,picture';
                               fbOAuth.getProtectedResource("https://graph.facebook.com/me"+meFields, access_token, function (error, data, response) {
                                   var profile = JSON.parse(data);
                                   console.log(profile);
                                   var avatar = '';  // https://graph.facebook.com/jeffpelton/picture?type=large
                                   if(profile.hasOwnProperty('picture')) {
                                       if(profile.picture.hasOwnProperty('data') && profile.picture.data.hasOwnProperty('url')) {
                                           avatar = profile.picture.data.url;
                                       } else {
                                           avatar = profile.picture+'?type=large';
                                       }
                                   } else {
                                   }
                                   // this is better than the crap that comes back from profile.picture
                                   avatar = 'https://graph.facebook.com/'+profile.id+'/picture?type=large';
                                   
                                   var fbSession = {"uid": profile.id, "accessToken": access_token};
                                   var updatedObject = {"$set": {"fbSession": fbSession, 'avatar': avatar}};
                                   
                                   // lookup to see if you 've connected before
                                   var query = {"fbSession.uid": profile.id};
                                   
                                   ds.find(col, query, function(err, data){
                                       if(err) {
                                           house.log.err(err);
                                       } else if(data) {
                                           if(data.length === 0) {
                                               // Offer to login, or register
                                           	if(req.session.data.user) {
                                           		// already logged in, lets connect to twitter
                                           		house.log.info('connect logged in user to facebook: '+req.session.data.user)
                                           		
                                           		ds.update(col, {"name": req.session.data.user}, updatedObject, function(err, docs) {
                                       				if(err) {
                                                           house.log.err(err);
                                       				} else {
                                       					house.log.debug(docs);
                                       				}
                                                       redirectFacebookUrl();
                                           		});
                                           	} else {
                                                    // REGISTER
                                                    var newUserDoc = {"name":profile.name, "displayName":profile.name, "groups":[], "fileQuota": startingQuota, "fbSession": {"uid": profile.id, "accessToken": access_token}};
                                                    
                                                    if(profile.hasOwnProperty('username')) {
                                                        newUserDoc.name = profile.username;
                                                    }
                                                    
                                                    newUserDoc.avatar = avatar;
                                                    
                                                    ds.insert(col, newUserDoc, function(err, user){
                                                        if(err) {
                                                            house.log.err(err);
                                                            res.end('error');
                                                        } else {
                                                            if(_.isArray(user)) {
                                                                user = _(user).first();
                                                            }
                                                            house.log.debug('new facebook user reg')
                                                            house.log.debug(user);
                                                            req.authorizeUser(user, function(){
                                                                redirectFacebookUrl();
                                                            });
                                                        }
                                                    });
                                           	}
                                           } else {
                                               var user = _.first(data);
                                               house.log.debug(user);
                                               house.log.debug('found facebook user with document')
                                               house.log.debug({"_id": user.id})
                                               house.log.debug(updatedObject)
                                                 ds.update(col, {"_id": user.id}, updatedObject, function(err, docs) {
                                                     if(err) house.log.err(err);
                                                 });
                                               // login user
                                                 req.authorizeUser(user, function(){
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
                   req.session.data['facebook_redirect_url']= req.headers.referer;
                   var redirectUrl = fbOAuth.getAuthorizeUrl({redirect_uri : fbRedirectUri, scope: fbScope, display:'page'})
                   res.writeHead(302, {'Location': redirectUrl});
                   res.end();
                }
            } else if(path.indexOf('/google') === 0) {
            } else if(path.indexOf('/linkedin') === 0) {
            } else if(path.indexOf('/github') === 0) {
            }
            
            
        } else if(req.method == 'POST') {
            house.log.debug('post');
            
            var getUniqueName = function(name, callback) {
                ds.count(col, {name: name}, function(err, length) {
                    if(length > 0) {
                        getUniqueName(name+'1', callback);
                    } else {
                        callback(name);
                    }
                });
            }
            
            if(path == '') {
                if(req.fields.hasOwnProperty('email') && req.fields.hasOwnProperty('pass')) {
                    var email = req.fields.email.toLowerCase();
                    var pass = hashPass(req.fields.pass);
                    
                    ds.find(col, {email: email, pass: pass}, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                            return;
                        }
                        if(data.length === 0) {
                            ds.find(col, {email: email}, function(err, data) {
                                if(err) {
                                    house.log.err(err);
                                    res.end('error');
                                } else if(data.length === 0) {
                                    
                                    var newUserDoc = {email: email, pass: pass};
                                    if(req.fields.name) {
                                        newUserDoc.name = req.fields.name;
                                    } else {
                                        newUserDoc.name = email.substr(0, email.indexOf('@'));
                                    }
                                    getUniqueName(newUserDoc.name, function(name) {
                                        newUserDoc.name = name;
                                    
                                        ds.insert(col, newUserDoc, function(err, data){
                                            if(err) {
                                                house.log.err(err);
                                                res.end('error');
                                            } else {
                                                var userData = data;
                                                if(_.isArray(data)) {
                                                    userData = _(data).first();
                                                }
                                                req.authorizeUser(userData, function(){
                                                    res.data(req.session.data);
                                                });
                                            }
                                        });
                                    });
                                } else {
                                    // incorrect password for user
                                    res.writeHead(403);
                                    res.end('{}');
                                }
                            });
                        } else {
                            var userData = data;
                            if(_.isArray(data)) {
                                userData = _(data).first();
                            }
                            req.authorizeUser(userData, function(){
                                res.data(req.session.data);
                            });
                        }
                    });
                }
                
                
            }
        } else if(req.method == 'PUT') {
            
        } else if(req.method == 'DELETE') {
            req.destroySession(function(){
                res.data({});
            });
        } else if(req.method == 'OPTIONS') {
            res.data({x:true});
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
    
    var getFacebookOAuth = function() {
        if(!options.facebook || !options.facebook.app.id || !options.facebook.app.secret) {
            house.log.err(new Error('options.facebook required'));
            return;
        }
        
        var fbOAuth = new OAuthTwo(options.facebook.app.id, options.facebook.app.secret,  "https://graph.facebook.com");
        
        return fbOAuth;
    }
    
    return handleReq;
});

