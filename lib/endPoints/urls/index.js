//
// # URLs Collection API Endpoint
//
var spawn = require('child_process').spawn;
var ObjectID = mongo.ObjectID;
var mkdirp = require('mkdirp');
(exports = module.exports = function(house, options) {

    // This endpoint requires a data source
    var ds = options.ds;
    var col = options.collection;

    var filesRoot = options.collectionFiles || ds.options.filesCol || 'files';
    var colFiles = filesRoot+'.files';
    var usersCol = 'users';
    var imagesCol = 'images';
    var articlesCol = options.collectionArticles || 'articles';
    var commentsCol = options.collectionComments || 'comments';

    // TODO var commentsEndPoint = house.api.getEndPointByName("comments");
    var feedEndPoint = house.api.getEndPointByName("feed");
    var imagesEndPoint = house.api.getEndPointByName("images");
    var articlesEndPoint = house.api.getEndPointByName(articlesCol);
    var subsEndPoint = house.api.getEndPointByName("subs");
    var twitterEndpoint = house.api.getEndPointByName("twitter");

    var ensureIndexes = function() {
        var collection = ds.db.collection(col);
        collection.ensureIndex({
            "at": -1,
            "url": 1
        }, function() {
            house.log.debug('index ensured for urls at url');
        });
        /*collection.ensureIndex({"ip": 1, "userAgent": 1, "user": 1}, function(){
            house.log.debug('index ensured for sessions ip userAgent user');
        });*/
    };
    ds.connected(function() {
        ensureIndexes();
    });

    var warmUpCache = 30000;
    if(house.config.hasOwnProperty('warmCache')) {
        warmUpCache = house.config.warmCache;
    }

    var cacheDir = process.cwd() + "/cache" + "/" + col + "/";
    mkdirp(cacheDir + 'share', function(err) {
        if(err) {
            house.log.err('mkdirp cache ' + col + ' error');
            house.log.err(err);
        } else {}
    });

    if(warmUpCache) {
        /*house.log.debug(col+' cache will warmup in '+warmUpCache);
        setTimeout(function(){
            house.log.debug(col+'-warming up cache');
            var toCache = [];
            ds.find(col, {groups:['public']}, function(err, data){
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    //house.log.debug(data.length+' posts to cache');
                    
                    _.each(data, function(doc){
                        //console.log(doc);
                        var postPath = 'id/'+doc.id;
                        //console.log(postPath)
                        if(doc.slug) {
                            postPath = doc.slug;
                        }
                        toCache.push(doc);
                    });
                    var cacheDone = function() {
                        house.log.debug('posts-done warming up cache');
                    }
                    var cacheOne = function(){
                        if(toCache.length > 0) {
                            cacheShareUrlHtml(toCache.pop(), function(){
                                house.log.debug('posts-cache another post...');
                                cacheOne();
                            });
                        } else {
                            cacheDone();
                        }
                    }
                    cacheOne();
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        },warmUpCache);*/
    }

    var cacheShareUrlHtml = function(doc, callback) {
        if(!doc.hasOwnProperty('groups') || doc.groups.indexOf('public') === -1) {
            // no need to cache private pages yet
            return;
        }
        var shareUrlPath = 'share/' + doc.id; //+encodeURIComponent(doc.url);
        var publishPath = cacheDir + shareUrlPath + '.html';
        var phantomCacheUrl = function(url, callback) {
            var html = '',
                title = '',
                desc = '';
            var screenRes = '1024x768x24'; // 640x480x24
            var phantomjs = spawn('phantomjs', ['--ignore-ssl-errors=yes', '--load-images=no', __dirname + '/phantomCache.js', url]);
            phantomjs.stdout.on('data', function(data) {
                //console.log('phantomjs.stdout: ' + data);
                html += data.toString();
            });

            phantomjs.stderr.on('data', function(data) {
                console.log('urls-cache !phantomjs stderr: ' + data);
            });

            phantomjs.on('exit', function(code) {
                house.log.debug(col + '-cache phantomjs process exited with code ' + code);

                //console.log(html);
                var sepStr = '|URLSRC|';
                var sepI = html.indexOf(sepStr);
                if(sepI !== -1) {
                    var consoleOut = html.substr(0, sepI).trim();
                    html = html.substr(sepI + sepStr.length).trim();
                }

                callback(null, html, title, consoleOut);
            });
        }

        var procPhantom = function() {
            var urlsShareUrl = house.config.site.url + "urls/" + shareUrlPath;
            house.log.debug(col + '-cache phantom urlsShareUrl: ' + urlsShareUrl);
            phantomCacheUrl(urlsShareUrl, function(err, html, title, consoleOut) {
                if(err) {
                    console.log('phantom debug: '+consoleOut);
                    house.log.err(err);
                }
                //console.log(html);
                // to root web for now
                //console.log(publishPath);
                //return; // TODO
                // house.log.debug(col + '-cache writeFile to publishPath: ' + publishPath);
                fs.writeFile(publishPath, html, function(err) {
                    if(err) {
                        house.log.err(err);
                        //res.data({});
                    }
                    if(callback) {
                        callback(publishPath, html);
                    }
                    //res.data({publish: putDoc["$set"].publish});
                });
            });
        }
        //house.log.debug('posts-cache phantomCacheUrl: '+house.config.site.url+"posts/"+postsPath);

        fs.unlink(publishPath, function(err) {
            procPhantom();
        });
    }

    var updateUserIdWithDoc = function(userId, doc, cb) {
        ds.update(usersCol, {
            _id: userId
        }, doc, function(err, data) {
            if(err) {
                console.log(err);
            } else {
                if(cb) cb();
            }
        });
    }
    var incUserField = function(userId, field, b) {
        b = b || 1;
        var updateDoc = {
            "$inc": {}
        };
        updateDoc["$inc"][field] = b;
        updateUserIdWithDoc(userId, updateDoc);
    }
    var incUserUrls = function(userId, b) {
        incUserField(userId, 'urlsCount', b);
    }
    var findUrlDoc = function(urlStr, callback) {
        var query = {
            url: urlStr
        };
        ds.find(col, query, function(err, docs) {
            if(err) {
                house.log.err(err);
                callback(err);
            } else {
                var doc = _.first(docs);
                callback(null, doc);
            }
        });
    }
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        
        var getTwitterEndpoint = function(url, callback) {
            twitterEndpoint({
                session: req.session,
                method: 'GET',
                url: url,
                // fields: doc
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

        var emitToRoomIn = function(col, verb, doc) {
            if(!house.io || !house.io.rooms) {
                // house.log.debug('no io to emit subs');
                return;
            } else {
                house.io.emitToRoomDocOwnerId(col, verb, doc);
            }
        }

        var countQuery = function(query, callback) {
            if(!query.hasOwnProperty('$or')) {
                query["$or"] = [];
            }
            if(query.hasOwnProperty('url') && req.method == 'GET' && req.hasOwnProperty('urlParsed')) {
                var i = req.urlParsed.href.indexOf('url=');
                query.url = req.urlParsed.href.substr(i + 4);
            }
            if(query.hasOwnProperty('q')) {
                var re = query.q;
                re = re.replace(/\?/gi, '\\?');
                //{$regex: re, $options: 'gi'}
                query.url = {
                    $regex: re,
                    $options: 'gi'
                }; // var regex = new RegExp(re, "i");
                delete query.q;
            }
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {} else if(req.session.data.user) {
                query["$or"].push({
                    "owner.id": req.session.data.user
                });
                if(req.session.data.groups) {
                    query["$or"].push({
                        "groups": {
                            $in: req.session.data.groups
                        }
                    });
                }
            } else {
                //query["groups"] = 'public';
                query["$or"].push({
                    "groups": 'public'
                });
            }
            if(query["$or"].length == 0) {
                delete query["$or"];
            }
            ds.count(col, query, function(err, data) {
                if(err) {
                    house.log.err(err);
                } else {
                    if(callback) {
                        callback(data);
                    } else {
                        res.setHeader('X-Count', data);
                        res.data({});
                    }
                }
            });
        }
        var filterData = function(data) {
            if(!_.isArray(data)) {
                if(data.hasOwnProperty('updates')) {
                    _.each(data.updates, function(doc, ii) {
                        delete data.updates[ii].src;
                    });
                }
            } else {
                _.each(data, function(doc, i) {
                    if(doc.hasOwnProperty('updates')) {
                        _.each(doc.updates, function(doc, ii) {
                            delete data[i].updates[ii].src;
                        });
                    }
                });
            }
            return data;
        }
        var findQuery = function(query, callback) {
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
            if(query.hasOwnProperty('url') && req.method == 'GET' && req.hasOwnProperty('urlParsed')) {
                var i = req.urlParsed.href.indexOf('url=');
                query.url = req.urlParsed.href.substr(i + 4);
            }
            if(query.hasOwnProperty('q')) {
                var re = query.q;
                re = re.replace(/\?/gi, '\\?');
                //{$regex: re, $options: 'gi'}
                query.url = {
                    $regex: re,
                    $options: 'gi'
                }; // var regex = new RegExp(re, "i");
                delete query.q;
            }
            // console.log(query);

            if(!query.hasOwnProperty('$or')) {
                query["$or"] = [];
            }
            if(req.session.data.groups && req.session.data.groups.indexOf('admin') !== -1) {} else if(req.session.data.user) {
                query["$or"].push({
                    "owner.id": req.session.data.user
                });
                if(req.session.data.groups) {
                    query["$or"].push({
                        "groups": {
                            $in: req.session.data.groups
                        }
                    });
                }
                query["$or"].push({
                    "groups": 'public'
                });
            } else {
                //query["groups"] = 'public';
                query["$or"].push({
                    "groups": 'public'
                });
            }
            if(query["$or"].length == 0) {
                delete query["$or"];
            }

            query.fields = {
                updates: 0
            };
            ds.find(col, query, function(err, data) {
                if(err) {
                    house.log.err(err);
                } else if(data) {
                    data = filterData(data);
                    if(callback) {
                        callback(data);
                    } else {
                        res.data(data);
                    }
                } else {
                    house.log.err(new Error('no data from mongo'));
                }
            });
        }
        
        var subsPost = function(postDoc, callback) {
            subsEndPoint({
                session: req.session,
                method: 'POST',
                url: '',
                fields: postDoc
            }, {
                end: function() {},
                data: function(doc) {
                    if(_.isArray(doc)) {
                        doc = _.first(doc);
                    }
                    if(callback) {
                        callback(doc);
                    }
                },
                writeHead: function() {}
            });
        }
        
        var postProfileUrl = function(newUrlDoc, callback) {
            handleReq.call(this, {
                session: req.session,
                method: 'POST',
                url: '',
                fields: newUrlDoc
            }, {
                end: function() {},
                data: function(doc) {
                    if(_.isArray(doc)) {
                        doc = _.first(doc);
                    }
                    if(callback) {
                        callback(doc);
                    }
                },
                writeHead: function() {}
            });
        }

        var insertDocToFeed = function(doc, callback) {
            var newFeedItem = {
                "ref": {
                    "col": "urls",
                    "id": doc.id
                },
                "url": doc,
                "groups": doc.groups,
                "owner": doc.owner,
                "at": doc.at,
            }
            feedEndPoint({
                session: req.session,
                method: 'POST',
                url: '',
                fields: newFeedItem
            }, {
                end: function() {},
                data: function(newFeedData) {
                    if(_.isArray(newFeedData)) {
                        newFeedData = _.first(newFeedData);
                    }
                    ds.update(col, {
                        "_id": doc.id
                    }, {
                        "$set": {
                            "feed": {
                                id: newFeedData.id,
                                at: newFeedData.at
                            }
                        }
                    }, function(err, data) {
                        if(callback) {
                            callback(newFeedData);
                        }
                    });
                },
                writeHead: function() {}
            });
        }
        var updateDocInFeed = function(doc) {
            var updateDoc = {
                "$set": {
                    "url": doc,
                    "groups": doc.groups,
                    "owner": doc.owner,
                    "at": doc.at,
                }
            }
            feedEndPoint({
                session: req.session,
                method: 'PUT',
                url: '/' + doc.feed.id,
                fields: updateDoc
            }, {
                end: function() {},
                data: function(newFeedData) {
                    if(_.isArray(newFeedData)) {
                        newFeedData = _.first(newFeedData);
                    }
                },
                writeHead: function() {}
            });
        }
        var removeDocFromFeed = function(doc) {
            if(doc.feed && doc.feed.id) {
                feedEndPoint({
                    session: req.session,
                    method: 'DELETE',
                    url: '/' + doc.feed.id,
                    fields: {
                        delete: true
                    }
                }, {
                    end: function() {},
                    data: function(newFeedData) {},
                    writeHead: function() {}
                });
            } else if(doc.id) {
                var feedQuery = {
                    "ref": {
                        "col": "urls",
                        "id": doc.id
                    }
                };
                ds.find('feed', feedQuery, function(err, data) {
                    _.each(data, function(e) {
                        var docId = e.id;
                        house.io.rooms. in ('feed').emit('deletedFeed', docId);
                    });
                    ds.remove('feed', feedQuery, function(err, data) {});
                });
            }
        }

        var cloneGridStoreFile = function(gs) {
            var fileObj = _.clone({
                id: gs.fileId,
                filename: gs.filename,
                length: gs.position,
                contentType: gs.contentType,
                metadata: _.clone(gs.metadata),
                uploadDate: gs.uploadDate
            });
            if(gs.id) {
                fileObj.id = gs.id;
            }
            if(gs.length) {
                fileObj.length = gs.length;
            }
            return fileObj;
        }
        
        var countShares = require('count-shares');
        var getUrlShareCounts = function(urlStr, callback) {
            countShares.get(encodeURIComponent(urlStr), function(err, result){
                if(err) {
                    house.log.err(err);
                    callback(err);
                } else {
                    //
                    // console.log(result);
                    var res = {
                        total: 0
                    }
                    for(var i in result) {
                        res[i] = parseInt(result[i], 10);
                        res.total = res.total + res[i];
                    }
                    callback(null, res);
                }
            }, ['facebook', 'twitter', 'linkedin', 'pinterest']);
        }
        var getUrlDocShareCounts = function(urlDoc, callback) {
            if(urlDoc.groups && urlDoc.groups.indexOf('public') !== -1) {
                getUrlShareCounts(urlDoc.url, callback);
            } else {
                callback(null);
            }
        }
        var updateShareCounts = function(urlDoc, callback) {
            getUrlDocShareCounts(urlDoc, function(err, shareCounts){
                if(err) {
                    house.log.debug("updateShareCounts getUrlDocShareCounts err on url: "+urlDoc.url);
                    house.log.err(err);
                }
                
                if(shareCounts) {
                    urlDoc.shareCounts = shareCounts;
                    ds.update(col, {_id: urlDoc.id}, {"$set": {"socialShares": shareCounts}}, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            emitToRoomIn(col, 'updated', urlDoc);
                            if(callback) {
                                callback();
                            }
                        }
                    });
                }
            });
        }

        var processUrls = function(urls, callback, copyOldArticles) {
            var updateUrlWithDocCalled = false;
            var updateUrlWithDoc = function(updateUrlDoc) {
                if(updateUrlWithDocCalled) {
                    house.log.debug('updateUrlWithDocCalled!');
                    return false;
                }
                updateUrlWithDocCalled = true;
                ds.update(col, {
                    "_id": urlDoc.id
                }, updateUrlDoc, function(err, updateData) {
                    ds.find(col, {
                        "_id": urlDoc.id
                    }, function(err, updatedData) {
                        if(err) {
                            callback(err);
                        } else {
                            if(updatedData.length > 0) {
                                if(callback) {
                                    callback(null, _.first(updatedData));
                                }
                            }
                        }
                    });
                });
            }
            //house.log.debug('process urls: ');
            //house.log.debug(urls);
            var urlDoc; ///////
            if(_.isArray(urls)) {
                urlDoc = _.first(urls);
            } else {
                urlDoc = urls;
            }
            
            if(urlDoc.proc === 1) {
                var doSkipProc = false;
                
                // not ready for update yet
                if(urlDoc.hasOwnProperty('nextUpdate')) {
                    if(urlDoc.nextUpdate > new Date()) {
                        doSkipProc = true;
                    }
                }
                
                // skip images too
                if(urlDoc.hasOwnProperty('file')) {
                    if(urlDoc.file.contentType.indexOf('image') === 0) {
                        doSkipProc = true;
                    }
                }
                
                if(doSkipProc === true) {
                    house.log.debug('skip proc of url');
                    if(callback) {
                        callback(null, urlDoc);
                    }
                    return;
                }
            }

            var saveArticle = function(article) {
                article["fromUrl"] = urlDoc.url;
                if(urlDoc.hasOwnProperty('parentUrl')) {
                    article["fromUrlParent"] = urlDoc.parentUrl;
                }
                if(copyOldArticles) {
                    article["copyOld"] = true;
                }

                // parse out dot notation field names
                for(var i in article) {
                    if(i.indexOf('.') !== -1) {
                        var k = i.replace(/\./g, '-');
                        article[k] = article[i];
                        delete article[i];
                    }
                }
                var postArticle = function(newArticle) {
                    var beforePostDate = new Date();
                    articlesEndPoint({
                        session: req.session,
                        method: 'POST',
                        url: '',
                        fields: newArticle
                    }, {
                        end: function() {},
                        data: function(data) {
                            if(_.isArray(data)) {
                                data = _.first(data);
                            }
    
                            //console.log(beforePostDate)
                            //console.log(data.at)
                            if(beforePostDate > data.at) {
                                //house.log.debug('-old article');
                            } else {
                                //house.log.debug('-new article');
                                ds.update(col, {
                                    "_id": urlDoc.id
                                }, {
                                    "$push": {
                                        "articleIds": data.id
                                    }
                                }, function(err, data) {
                                    //house.log.debug('updated url articleIds with new article');
                                });
                            }
                        },
                        writeHead: function() {}
                    });
                }
                
                if(article.link) {
                    if(article.tweet) {
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
                    } else {
                        getUrlShareCounts(article.link, function(err, shareCounts) {
                            if(err) {
                                house.log.debug("getUrlShareCounts err on article.link: "+article.link);
                                house.log.err(err);
                            }
                            if(shareCounts) {
                                article.socialShares = shareCounts;
                            }
                            postArticle(article);
                        });
                    }
                } else {
                    postArticle(article);
                }
            }

            var metadata = {
                refs: [{
                    col: col,
                    id: urlDoc.id
                }],
                src: "urls"
            };
            if(urlDoc.hasOwnProperty('groups')) {
                metadata.groups = urlDoc.groups;
            }
            if(urlDoc.hasOwnProperty('tags')) {
                metadata.tags = urlDoc.tags;
            }
            if(urlDoc.hasOwnProperty('owner')) {
                metadata.owner = urlDoc.owner;
            }
            
            house.utils.media.gridfs.importUrl(ds.db, filesRoot, urlDoc.url, metadata, function(err, gridStore) {
                //console.log('house.utils.media.gridfs.importUrl imported');
                //console.log(gridfile);
                if(err) {
                    house.log.err(err);
                } else {
                    var gridfile = cloneGridStoreFile(gridStore);
                    //console.log(gridfile);
                    // update url with file
                    var updateUrlDoc = {
                        "$set": {
                            file: cloneGridStoreFile(gridStore),
                            proc: 1
                        }
                    };
                    // console.log('---updatedoc---')
                    // console.log(updateUrlDoc);
                    // console.log(updateUrlDoc["$set"].file.metadata);
                    // proc files of type image
                    if(gridfile.contentType.indexOf('image') !== -1) {
                        //console.log('proc image url');
                        getUrlDocShareCounts(urlDoc, function(err, shareCounts){
                            if(err) {
                                house.log.debug("getUrlDocShareCounts err on url: "+urlDoc.url);
                                house.log.err(err);
                            }
                            // console.log("shareCounts")
                            // console.log(shareCounts)
                            
                            if(shareCounts) {
                                updateUrlDoc["$set"].socialShares = shareCounts;
                            }
                            var filesEndPoint = house.api.getEndPointByName('files');
                            filesEndPoint.call(this, {
                                session: req.session,
                                method: 'PUT',
                                url: '/' + gridfile.id,
                                fields: {
                                    "$set": {
                                        "metadata.proc": 0
                                    }
                                }
                            }, {
                                end: function() {},
                                data: function(resData) {
                                    //console.log('files response for file '+gridfile.id);
                                    //console.log(resData);
                                    if(resData.hasOwnProperty('image')) {
                                        updateUrlDoc["$set"].image = resData.image;
                                    }
                                    updateUrlWithDoc(updateUrlDoc);
                                },
                                writeHead: function() {}
                            });
                        });
                    } else if(gridfile.contentType == 'application/atom+xml' || gridfile.contentType == 'application/rss+xml' || gridfile.contentType == 'application/xml' || gridfile.contentType == 'text/xml' || gridfile.contentType == 'text/plain') {
                        var parseGridFileFeed = function(callback) {
                            house.log.debug('urls endpoint - parse for articles');

                            var FeedParser = require('feedparser');
                            var parseOpts = {
                                normalize: true,
                                addmeta: false
                            };
                            var feedStream = new FeedParser(parseOpts);
                            var feedMeta;
                            var articlesFoundCount = 0;
                            var errorState = false;
                            feedStream.on('error', function (error) {
                                errorState = true;
                                callback(error);
                            });
                            feedStream.on('meta', function (meta) {
                                // house.log.debug('feed parsed meta')
                                // house.log.debug(meta);
                                feedMeta = meta;
                            });
                            feedStream.on('readable', function () {
                                var stream = this, item;
                                while (item = stream.read()) {
                                //   house.log.debug('Found article: '+item.title || item.description);
                                  saveArticle(item);
                                  articlesFoundCount++;
                                }
                            });
                            feedStream.on('end', function () {
                                house.log.debug('Done parsing feed.  Found '+articlesFoundCount+' articles.');
                                if(!errorState) {
                                    callback(null, feedMeta);
                                }
                            });
                            
                            house.utils.media.gridfs.readFile(ds.db, filesRoot, gridfile.filename, function(err, data){
                                if(err) {
                                    house.log.err('urlsendpoint gridfs.readFile err');
                                    house.log.err(err);
                                } else {
                                    feedStream.end(data);
                                }
                            });
                        }

                        var channel = {};
                        if(gridfile.metadata.exif) {
                            if(gridfile.metadata.exif.hasOwnProperty("Rss Version")) {
                                //console.log(gridfile.metadata.exif["Rss Version"]);
                            }
                            if(gridfile.metadata.exif.hasOwnProperty("Rss Channel Title")) {
                                channel.title = gridfile.metadata.exif["Rss Channel Title"];
                            }
                            if(gridfile.metadata.exif.hasOwnProperty("Rss Channel Link")) {
                                channel.link = gridfile.metadata.exif["Rss Channel Link"];
                            }
                            if(gridfile.metadata.exif.hasOwnProperty("Rss Channel Description")) {
                                channel.desc = gridfile.metadata.exif["Rss Channel Description"];
                            }
                            if(gridfile.metadata.exif.hasOwnProperty("Rss Channel Language")) {
                                channel.lang = gridfile.metadata.exif["Rss Channel Language"];
                            }
                            if(gridfile.metadata.exif.hasOwnProperty("Rss Channel Link Type")) {
                                channel.type = gridfile.metadata.exif["Rss Channel Link Type"];
                            }
                        }
                        parseGridFileFeed(function(err, meta) {
                            if(err) {
                                house.log.err(err);
                            } else {
                                channel.meta = meta;
                                channel.last = new Date();
                                updateUrlDoc["$set"].lastUpdate = new Date();
                                if(meta.link) {
                                    channel.link = meta.link;
                                }
                                if(meta.title) {
                                    channel.title = meta.title;
                                }
                                if(meta.description) {
                                    channel.desc = meta.description;
                                }

                                updateUrlDoc["$set"].channel = channel;
                                if(channel.link && (!urlDoc.channel || !urlDoc.channel.link || !urlDoc.channel.url)) {
                                    // post this to urls
                                    var metaChannelUrl = {
                                        "url": channel.link,
                                        "rssUrl": urlDoc.url,
                                        "parentUrl": urlDoc.url
                                    };
                                    if(urlDoc.hasOwnProperty('groups')) {
                                        metaChannelUrl.groups = urlDoc.groups;
                                    }
                                    handleReq.call(this, {
                                        session: req.session,
                                        method: 'POST',
                                        url: '',
                                        fields: metaChannelUrl
                                    }, {
                                        end: function() {},
                                        data: function(resData) {
                                            //house.log.debug('posted url of channel link');
                                            //house.log.debug(resData);
                                            if(resData) { //.faviconfile
                                                updateUrlDoc["$set"].channel.url = resData;
                                                updateUrlWithDoc(updateUrlDoc);
                                            } else {
                                                updateUrlWithDoc(updateUrlDoc);
                                            }
                                        },
                                        writeHead: function() {}
                                    });
                                } else {
                                    //updateUrlDoc["$set"]["channel.meta"] = meta;
                                    // could update meta title desc
                                    updateUrlWithDoc(updateUrlDoc);
                                }
                            }
                        });
                    } else if(gridfile.contentType == 'text/html') {
                        house.log.debug('text/html URL');
                        var phantomUrl = function(url, callback) {
                            
                            var callbackErrorWithHtml = function(msg) {
                                house.utils.media.gridfs.readFile(ds.db, filesRoot, gridfile.filename, function(err, data){
                                    if(err) {
                                        house.log.err('urlsendpoint gridfs.readFile err');
                                        house.log.err(err);
                                    } else {
                                        if(data) {
                                            // console.log(data.toString())
                                            callback(new Error(msg), null, data.toString());
                                        } else {
                                            callback(new Error(msg));
                                        }
                                    }
                                });
                            }
                            
                            if(url.indexOf('https://twitter.com/') === 0) {
                                
                                var getSomeTweets = function(callback) {
                                    // get some tweets from the user
                                    if(urlDoc.channel.meta.hasOwnProperty('screen_name')) {
                                        var screenName = urlDoc.channel.meta.screen_name;
                                        var sinceQuery = (urlDoc.channel.hasOwnProperty('status') && urlDoc.channel.status.id_str) ? 'since_id='+urlDoc.channel.status.id_str+'&' : '';
                                        getTwitterEndpoint('/statuses/user_timeline.json?'+sinceQuery+'include_rts=1&trim_user=t&count=200&screen_name='+screenName, function(err, data){
                                            if(err) {
                                                house.log.err(err);
                                            } else {
                                                if(data) {
                                                    _.each(data, function(e,i,a){
                                                        if(i === 0) {
                                                            updateUrlDoc["$set"]["channel.last"] = new Date();
                                                            updateUrlDoc["$set"]["channel.status"] = {
                                                                id_str: e.id_str
                                                            }
                                                        }
                                                        
                                                        // save tweet as an article
                                                        // console.log(e);
                                                        var permaLink = 'https://twitter.com/'+screenName+'/status/'+e.id_str;
                                                        var article = {
                                                            summary: e.text,
                                                            date: new Date(e.created_at),
                                                            author: '@'+screenName,
                                                            link:  permaLink,
                                                            guid:  permaLink,
                                                            tweet: e
                                                        }
                                                        if(e.hasOwnProperty('entities')) {
                                                            article.entities = e.entities;
                                                            if(e.entities.hasOwnProperty('urls') && _.size(e.entities.urls) > 0) {
                                                                // console.log(e.entities.urls);
                                                                //[ { url: 'http://t.co/QraeeHqK1x',
                                                                // expanded_url: 'http://dlvr.it/4TW0Ry',
                                                                // display_url: 'dlvr.it/4TW0Ry',
                                                                // indices: [ 107, 129 ] } ]
                                                            }
                                                        }
                                                        saveArticle(article);
                                                    });
                                                    
                                                    if(callback) {
                                                        callback();
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                                
                                if(urlDoc.channel && urlDoc.channel.type == "application/twitter") {
                                    // grab twitter user profile at channel image
                                    if(urlDoc.channel.meta.hasOwnProperty('profile_image_url')) {
                                        var profileUrl = urlDoc.channel.meta.profile_image_url;
                                        postProfileUrl({url: profileUrl, parentUrl: urlDoc.url, groups: ['public']}, function(newUrlDoc){
                                            if(newUrlDoc && newUrlDoc.image) {
                                                updateUrlDoc["$set"]["channel.image"] = newUrlDoc.image;
                                                // callbackErrorWithHtml("Skip phontom screenshot of twitter.com URL, but get avatar for channel.");
                                            } else {
                                                // callbackErrorWithHtml("Skip phontom screenshot of twitter.com URL.");
                                            }
                                            getSomeTweets(function(){
                                                callbackErrorWithHtml("Skip phontom screenshot of twitter.com URL.");
                                            });
                                        });
                                    }
                                    
                                } else {
                                    callbackErrorWithHtml("Skip phontom screenshot of twitter.com URL.");
                                }
                                return;
                            }
                            
                            //phantom it up
                            house.log.debug('phantomjs proc html URL');
                            var html = '',
                                title = '',
                                desc = '';
                            var urlstr = encodeURIComponent(url);
                            if(urlstr.length > 200) urlstr = urlstr.substr(-200);
                            var fullPath = '/tmp/' + urlstr + '.png';
                            var screenRes = '1024x768x24'; // 640x480x24
                            //var phantomjs = spawn('xvfb-run', ['-as', '-screen 0 '+screenRes, 'phantomjs', __dirname+'/phantom.js', url, fullPath]);
                            var phantomjs = spawn('phantomjs', [__dirname + '/phantom.js', url, fullPath]);
                            phantomjs.stdout.on('data', function(data) {
                                //house.log.debug('phantomjs.stdout: ' + data);
                                html += data.toString();
                                if(title == '') {
                                    var matches = html.match(/Page\stitle:\s(.*)/);
                                    if(matches) {
                                        title = matches[1];
                                    }
                                }
                            });

                            phantomjs.stderr.on('data', function(data) {
                                console.log('!phantomjs stderr: ' + data);
                            });

                            phantomjs.on('exit', function(code) {
                                house.log.debug('urls phantomjs process exited with code ' + code);
                                if(html) { // good
                                    if(title != '') {
                                        //console.log('url phantom got title: '+title);
                                        html = html.substr(html.indexOf(title) + title.length);
                                    }
                                }
                                if(html.indexOf('Unable to load the address!') !== -1) {
                                    // console.log(gridStore.position);
                                    callbackErrorWithHtml("Unable to load the URL.");
                                } else {
                                    callback(null, fullPath, html, title);
                                }
                            });
                        }

                        var importOgImageUrl = function(ogImageUrl, callback) {
                            house.utils.media.gridfs.importUrl(ds.db, filesRoot, ogImageUrl, metadata, function(err, ogImageUrlGridStore) {
                                //house.log.debug('house.utils.media.gridfs.importUrl imported favicon url type:');
                                //house.log.debug(gridfile.contentType)
                                if(err) {
                                    house.log.err(err);
                                } else {
                                    if(callback) {
                                        if(ogImageUrlGridStore.contentType.indexOf('image/') === 0) {
                                            callback(ogImageUrl, ogImageUrlGridStore);
                                        } else {
                                            callback(ogImageUrl, ogImageUrlGridStore);
                                        }
                                    }
                                }
                            });
                        }

                        var findMetaImageThumbnail = function(urlStr, html, callback) {

                            var findUrlDocImportOgImage = function(ogImageUrl) {
                                
                                if(ogImageUrl.substr(0, 4) == 'http') {
                                    ogImageUrl = ogImageUrl;
                                } else if(ogImageUrl.substr(0, 2) == '//') {
                                    ogImageUrl = 'http:' + ogImageUrl; // TODO https instead?
                                } else {
                                    if(ogImageUrl.substr(0, 1) !== '/') {
                                        ogImageUrl = '/' + ogImageUrl;
                                    }
                                    var parsedUrl = url.parse(urlStr);
                                    ogImageUrl = parsedUrl.protocol + '//' + parsedUrl.host + ogImageUrl;
                                }
                                
                                findUrlDoc(ogImageUrl, function(err, urlDoc) {
                                    if(err) {
                                        house.log.err(err);
                                    } else if(urlDoc) {
                                        if(urlDoc.ogFile) {
                                            
                                            if(urlDoc.image) {
                                                updateUrlDoc["$set"].ogImage = urlDoc.image;
                                            }
                                            // if(urlDoc.ogFile.metadata.srcUrl) {
                                            //     updateUrlDoc["$set"].ogImage.srcUrl = urlDoc.ogFile.metadata.srcUrl;
                                            // }
                                            
                                            callback(ogImageUrl, urlDoc.ogFile, urlDoc);
                                        }
                                    } else {
                                        importOgImageUrl(ogImageUrl, callback);
                                    }
                                });
                            }

                            house.log.debug('findMetaImageThumbnail')
                            //<meta property="og:image" content="http://i1.ytimg.com/vi/Id7e-9WaxMc/maxresdefault.jpg">
                            //<meta itemprop="image" property="og:image" content="http://i2.cdn.turner.com/cnn/dam/assets/131129172339-cnnee-enc-pope-nobel-peace-and-reports-00005120-horizontal-gallery.jpg" />
                            var regex = new RegExp(/<meta(.*)property="og:image" content="(.*?)"/);
                            var matches = regex.exec(html);

                            if(matches && matches.length > 0) {
                                house.log.debug('og:image matches');
                                //house.log.debug(matches)
                                var ogImageUrl = matches[2];
                                house.log.debug('found og:image url ' + ogImageUrl);
                                findUrlDocImportOgImage(ogImageUrl);
                            } else {
                                // <link rel="image_src" href="http://i.imgur.com/FId5RgX.jpg"/>
                                var image_src_regex = new RegExp(/<link(.*)rel="image_src" href="(.*?)"/);
                                var imgSrcMatches = image_src_regex.exec(html);

                                if(imgSrcMatches && imgSrcMatches.length > 0) {
                                    house.log.debug('og:image imgSrcMatches');
                                    var linkImageUrl = imgSrcMatches[2];
                                    findUrlDocImportOgImage(linkImageUrl);
                                } else {

                                    // <a href="http://www.theblaze.com/wp-content/uploads/2013/12/FirefoxScreenSnapz088.jpg" rel="attachment">

                                    var image_attachment_regex_a = new RegExp(/<a(.*)rel="attachment" href="(.*?)"/);
                                    var image_attachment_matches = image_attachment_regex_a.exec(html);

                                    if(image_attachment_matches && image_attachment_matches.length > 0) {
                                        house.log.debug('og:image image_attachment_matches');
                                        var linkImageUrl = image_attachment_matches[2];
                                        findUrlDocImportOgImage(linkImageUrl);
                                    } else {
                                        var image_attachment_regex_b = new RegExp(/<a(.*)href="(.*?)".*rel="attachment"/);
                                        var image_attachment_matches = image_attachment_regex_b.exec(html);

                                        if(image_attachment_matches && image_attachment_matches.length > 0) {
                                            house.log.debug('og:image image_attachment_matches');
                                            var linkImageUrl = image_attachment_matches[2];
                                            findUrlDocImportOgImage(linkImageUrl);
                                        } else {

                                            //<meta property="http://ogp.me/ns#image" content="http://cdn.surf.transworld.net/wp-content/themes/surf3.0/images/fb-og-logo-surf.png">
                                            var meta_property_ogp_image_regex = new RegExp(/<meta(.*)property="http:\/\/ogp.me\/ns#image" content="(.*?)"/);
                                            var meta_property_ogp_image_matches = meta_property_ogp_image_regex.exec(html);

                                            if(meta_property_ogp_image_matches && meta_property_ogp_image_matches.length > 2) {
                                                house.log.debug('og:image meta_property_ogp_image_matches');
                                                var meta_property_ogp_image_url = meta_property_ogp_image_matches[2];
                                                findUrlDocImportOgImage(meta_property_ogp_image_url);
                                            } else {

                                                //<meta content="http://i2.cdn.turner.com/cnn/dam/assets/130821104930-dianne-york-story-top.jpeg" itemprop="thumbnailUrl" property="og:image"/>
                                                var meta_itemprop_og_image = new RegExp(/<meta(.*)content="(.*?)" itemprop="thumbnailUrl"/);
                                                var meta_itemprop_og_image_matches = meta_itemprop_og_image.exec(html);

                                                if(meta_itemprop_og_image_matches && meta_itemprop_og_image_matches.length > 2) {
                                                    house.log.debug('og:image meta_itemprop_og_image_matches');
                                                    var meta_itemprop_og_image_url = meta_itemprop_og_image_matches[2];
                                                    findUrlDocImportOgImage(meta_itemprop_og_image_url);
                                                } else {
                                                    // console.log('no og:image imgSrcMatches');
                                                    callback(false);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        var findFavicon = function(urlStr, html, callback) {
                            var parsedUrl = url.parse(urlStr);
                            //console.log(parsedUrl)
                            var faviconUrl = '';
                            faviconUrl = parsedUrl.protocol + '//' + parsedUrl.host + '/favicon.ico';
                            // <link href="/images/favicon.ico" rel="shortcut icon" type="image/x-icon" /> 
                            // <link rel="shortcut icon" type="image/x-icon" href="favicon.ico">
                            // <link rel="icon" type="image/png" href="http://example.com/icon.png" />
                            // <link href="https://ssl.gstatic.com/news-static/img/favicon.ico" rel="icon" type="image/x-icon"/>
                            var faviReg = new RegExp(/<link rel=("|\').*icon("|\') href=("|\')(.*?)("|\')/i);
                            var faviMatches = faviReg.exec(html);
                            if(faviMatches && faviMatches.length > 4) {
                                faviconUrl = faviMatches[4];
                                house.log.debug('-found favicon url, method a '+faviconUrl);
                            } else {
                                var faviRegB = new RegExp(/<link href=("|\')(.*?)("|\') rel=("|\').*icon("|\')/i);
                                var faviBMatches = faviRegB.exec(html);
                                if(faviBMatches && faviBMatches.length > 2) {
                                    faviconUrl = faviBMatches[2];
                                    house.log.debug('-found favicon url, method b '+faviconUrl);
                                } else {
                                    // <link rel="apple-touch-icon-precomposed" href="http://www.producthunt.co/assets/ph-ios-icon-85297a7435825ee59a4fff8f3ef2434f.png">
                                    var faviRegC = new RegExp(/<link rel=("|\').*?apple-touch-icon.*?("|\') href=("|\')(.*?)("|\')/i);
                                    var faviCMatches = faviRegC.exec(html);
                                    if(faviCMatches && faviCMatches.length > 4) {
                                        faviconUrl = faviCMatches[4];
                                        house.log.debug('-found favicon url, method c '+faviconUrl);
                                    } else {
                                        var faviRegD = new RegExp(/<link href=("|\')(.*?)("|\').*?rel=("|\').*apple-touch-icon.*("|\')/i);
                                        var faviDMatches = faviRegD.exec(html);
                                        if(faviDMatches && faviDMatches.length > 2) {
                                            faviconUrl = faviDMatches[2];
                                            house.log.debug('-found favicon url, method d '+faviconUrl);
                                        } else {
                                            var faviRegE = new RegExp(/<link rel=("|\').*?icon("|\') type=("|\')image\/.*?("|\') href=("|\')(.*?)("|\')/i);
                                            var faviMatchesE = faviRegE.exec(html);
                                            house.log.debug(faviMatchesE)
                                            if(faviMatchesE && faviMatchesE.length > 6) {
                                                faviconUrl = faviMatchesE[6];
                                                house.log.debug('-found favicon url, method e '+faviconUrl);
                                            } else {
                                            }
                                        }
                                    }
                                }
                            }

                            if(faviconUrl.substr(0, 4) == 'http') {
                                faviconUrl = faviconUrl;
                            } else if(faviconUrl.substr(0, 2) == '//') {
                                faviconUrl = 'http:' + faviconUrl; // TODO https instead?
                            } else {
                                if(faviconUrl.substr(0, 1) !== '/') {
                                    faviconUrl = '/' + faviconUrl;
                                    if(parsedUrl.pathname !== '/') {
                                        var lastSlash = parsedUrl.pathname.lastIndexOf('/');
                                        var path = parsedUrl.pathname.substr(0, lastSlash);
                                        faviconUrl = parsedUrl.protocol + '//' + parsedUrl.host + path + faviconUrl;
                                    } else {
                                        faviconUrl = parsedUrl.protocol + '//' + parsedUrl.host + faviconUrl;
                                    }
                                } else {
                                    faviconUrl = parsedUrl.protocol + '//' + parsedUrl.host + faviconUrl;
                                }
                                // console.log(parsedUrl)
                            }
                            house.log.debug('full favicon url: '+faviconUrl);
                            var importNewFavicon = function() {
                                house.utils.media.gridfs.importUrl(ds.db, filesRoot, faviconUrl, metadata, function(err, faviconGridStore) {
                                    //house.log.debug('house.utils.media.gridfs.importUrl imported favicon url type:');
                                    //house.log.debug(gridfile.contentType)
                                    if(err) {
                                        house.log.debug('err');
                                        house.log.err(err);
                                        callback(false);
                                    } else {
                                        //console.log('imported favicon!!!!!!!!');
                                        var faviconGridFile = cloneGridStoreFile(faviconGridStore);
                                        /*var g = {
                                            id: gridfile.fileId,
                                            filename: gridfile.filename,
                                            length: gridfile.position,
                                            contentType: gridfile.contentType,
                                            metadata: gridfile.metadata,
                                            uploadDate: gridfile.uploadDate
                                        }*/

                                        // insert a url doc for the favicon too =\
                                        var insertFavicon = function() {
                                            var newUrlDoc = {};
                                            newUrlDoc.url = faviconUrl;
                                            newUrlDoc.proc = 1;
                                            newUrlDoc.faviconfile = faviconGridFile;
                                            newUrlDoc.parentUrl = urlDoc.url;
                                            newUrlDoc.file = {
                                                id: faviconGridFile.id,
                                                filename: faviconGridFile.filename,
                                                contentType: faviconGridFile.contentType
                                            };
                                            newUrlDoc.at = new Date();
                                            newUrlDoc.owner = {
                                                id: req.session.data.user,
                                                name: req.session.data.name
                                            }
                                            if(urlDoc.groups) {
                                                newUrlDoc.groups = urlDoc.groups;
                                            }
                                            ds.insert(col, newUrlDoc, function(err, data) {
                                                if(err) {
                                                    house.log.err(err);
                                                    res.end('error saving favicon url doc');
                                                } else {
                                                    house.log.debug('saved url for favicon');
                                                }
                                            });
                                        }();

                                        if(callback) {
                                            if(faviconGridFile.contentType.indexOf('image/') === 0) {
                                                callback(faviconGridFile);
                                            } else {
                                                callback(faviconGridFile);
                                            }
                                        }
                                    }
                                });
                            }

                            // console.log('favicon url for html file ' + faviconUrl);
                            findUrlDoc(faviconUrl, function(err, urlDoc) {
                                if(err) {
                                    house.log.err(err);
                                } else if(urlDoc) {
                                    if(urlDoc.faviconfile) {
                                        callback(urlDoc.faviconfile);
                                    } else {
                                        // console.log('have url, not favicon though');
                                        callback(urlDoc.faviconfile);
                                    }
                                } else {
                                    importNewFavicon();
                                }
                            });
                        }
                        var findHtmlTitle = function(html) {
                            var regExpTitle = new RegExp(/<title>(.*?)<\/title>/);
                            var regExpTitleMatches = regExpTitle.exec(html);
                            if(regExpTitleMatches && regExpTitleMatches.length > 1) {
                                return regExpTitleMatches[1];
                            } else {
                                return false;
                            }
                        }
                        var findHtmlDesc = function(html) {
                            var descRegExpMeta = new RegExp(/<meta(.*)name="description" content="(.*?)"/);
                            var descRegExpMetaMatches = descRegExpMeta.exec(html);
                            if(descRegExpMetaMatches && descRegExpMetaMatches.length > 2) {
                                return descRegExpMetaMatches[2];
                            } else {
                                // <meta property="og:description" content=" blah blah blah "/>
                                var descRegExpOg = new RegExp(/<meta(.*)property="og:description" content="(.*?)"/);
                                var descRegExpOgMatches = descRegExpOg.exec(html);
                                if(descRegExpOgMatches && descRegExpOgMatches.length > 2) {
                                    return descRegExpOgMatches[2];
                                } else {
                                    return false;
                                }
                            }
                        }
                        
                        var findHtmlLinkRss = function(html, urlStr) {
                            //<link href="http://rss.cnn.com/rss/cnn_topstories.rss" rel="alternate" title="CNN - Top Stories [RSS]" type="application/rss+xml"/>
                            //<link rel="alternate" type="application/rss+xml" title="Hack a Day &raquo; Feed" href="http://feeds2.feedburner.com/hackaday/LgoM" />
                            var linkRss = '';
                            var matches = new RegExp(/<link(.*?)rel="alternate" type="application\/rss\+xml"(.*?)href="(.*?)"/).exec(html);
                            if(matches && matches.length > 3) {
                                linkRss = matches[3];
                            } else {
                                var matchesB = new RegExp(/<link(.*)href="(.*?)"(.*)rel="alternate"(.*)type="application\/rss\+xml"/).exec(html);
                                if(matchesB && matchesB.length > 2) {
                                    linkRss = matchesB[2];
                                }
                            }
                            if(linkRss.substr(0, 4) == 'http') {
                                linkRss = linkRss;
                            } else if(linkRss.substr(0, 2) == '//') {
                                linkRss = 'http:' + linkRss; // TODO https instead?
                            } else if(linkRss) {
                                if(linkRss.substr(0, 1) !== '/') {
                                    linkRss = '/' + linkRss;
                                }
                                var parsedUrl = url.parse(urlStr);
                                linkRss = parsedUrl.protocol + '//' + parsedUrl.host + linkRss;
                            }
                            
                            return linkRss;
                        }
                        
                        var findFaviAndMeta = function(html) {
                            findFavicon(urlDoc.url, html, function(faviconGs) {
                                if(faviconGs) {
                                    var favifile = cloneGridStoreFile(faviconGs);
                                    // update url with file
                                    updateUrlDoc["$set"].faviconfile = favifile;
    
                                    //// Check for meta image thumb
                                    findMetaImageThumbnail(urlDoc.url, html, function(ogImageUrl, metaiconGs, existingMetaImageUrlDoc) {
                                        var doProc = true;
                                        if(existingMetaImageUrlDoc && existingMetaImageUrlDoc.proc) {
                                        //if(metaiconGs.metadata && metaiconGs.metadata.proc) {
                                            doProc = false;
                                            // console.log('no need to proc file');
                                            
                                            // if(resData.hasOwnProperty('image')) {
                                            //     updateUrlDoc["$set"].ogImage = resData.image;
    
                                            //     if(metafile.metadata.srcUrl) {
                                            //         updateUrlDoc["$set"].ogImage.srcUrl = metafile.metadata.srcUrl;
                                            //     }
                                            //     insertOgImageUrl(updateUrlDoc["$set"].ogImage);
                                            // } else {
                                            //     updateUrlDoc["$set"].ogFile = metafile;
                                            // }
                                        }
                                        if(doProc && metaiconGs) {
                                            var ogFile = cloneGridStoreFile(metaiconGs);
                                            house.log.debug('imported og:image url to file id ' + ogFile.id);
                                            // insert a url doc for the og image we imported
                                            var insertOgImageUrl = function(image) {
                                                var newUrlDoc = {};
                                                newUrlDoc.image = image;
                                                newUrlDoc.url = ogImageUrl;
                                                newUrlDoc.proc = 1;
                                                newUrlDoc.ogFile = ogFile;
                                                newUrlDoc.parentUrl = urlDoc.url;
                                                newUrlDoc.file = {
                                                    id: ogFile.id,
                                                    name: ogFile.filename,
                                                    contentType: ogFile.contentType,
                                                    metadata: ogFile.metadata
                                                };
                                                newUrlDoc.at = new Date();
                                                newUrlDoc.owner = {
                                                    id: req.session.data.user,
                                                    name: req.session.data.name
                                                }
                                                if(urlDoc.groups) {
                                                    newUrlDoc.groups = urlDoc.groups;
                                                }
                                                ds.insert(col, newUrlDoc, function(err, data) {
                                                    if(err) {
                                                        house.log.err(err);
                                                        //res.end('error saving og meta url doc');
                                                    } else {
                                                        house.log.debug('saved url for og meta');
                                                    }
                                                });
                                            };
    
                                            var metafile = _.clone(ogFile);
    
                                            // proc files of type image
                                            if(doProc && metafile.contentType.indexOf('image') !== -1) {
                                                //console.log('proc og/meta image file ' + metafile.id);
                                                var filesEndPoint = house.api.getEndPointByName('files');
                                                filesEndPoint.call(this, {
                                                    session: req.session,
                                                    method: 'PUT',
                                                    url: '/' + metafile.id,
                                                    fields: {
                                                        "$set": {
                                                            "metadata.proc": 0
                                                        }
                                                    }
                                                }, {
                                                    end: function() {},
                                                    data: function(resData) {
                                                        //console.log('files response for file '+gridfile.id);
                                                        //console.log(resData);
                                                        if(resData.hasOwnProperty('image')) {
                                                            updateUrlDoc["$set"].ogImage = resData.image;
    
                                                            if(metafile.metadata.srcUrl) {
                                                                updateUrlDoc["$set"].ogImage.srcUrl = metafile.metadata.srcUrl;
                                                            }
                                                            insertOgImageUrl(updateUrlDoc["$set"].ogImage);
                                                        } else {
                                                            // should have been an image, but log it anywys?
                                                            updateUrlDoc["$set"].ogFile = metafile;
                                                        }
                                                        updateUrlWithDoc(updateUrlDoc);
                                                    },
                                                    writeHead: function() {}
                                                });
                                            } else {
                                                updateUrlWithDoc(updateUrlDoc);
                                            }
                                        } else {
                                            updateUrlWithDoc(updateUrlDoc);
                                        }
                                    });
                                } else {
                                    updateUrlWithDoc(updateUrlDoc);
                                }
                            });
                        }
                        var updateUrlDocTimestamps = function() {
                            var timeFromToday = new Date();
                            var updateRate = urlDoc.updateRate || 30 * 24 * 60 * 60 * 1000;
                            timeFromToday.setTime(timeFromToday.getTime() + updateRate);
                            updateUrlDoc["$set"].lastUpdate = new Date();
                            updateUrlDoc["$set"].nextUpdate = timeFromToday;
                            updateUrlDoc["$set"].updateRate = updateRate;
                        }
                        
                        updateUrlDocTimestamps();
                        
                        getUrlDocShareCounts(urlDoc, function(err, shareCounts){
                            if(err) {
                                house.log.debug("getUrlDocShareCounts err on url: "+urlDoc.url);
                                house.log.err(err);
                            }
                            
                            if(shareCounts) {
                                updateUrlDoc["$set"].socialShares = shareCounts;
                            }
                            
                            phantomUrl(urlDoc.url, function(err, phantomImagePath, html, title) {
                                if(err) {
                                    house.log.debug("phantomUrl err on url: "+urlDoc.url);
                                    
                                    if(err.message.indexOf('Skip phontom') === -1) {
                                        house.log.err(err);
                                    }
                                    // Continue on without the phantomImagePath
                                    
                                    if(html) {
                                        var htmlTitle = findHtmlTitle(html);
                                        if(title) {
                                            updateUrlDoc["$set"].title = title;
                                        } else if(htmlTitle) {
                                            updateUrlDoc["$set"].title = htmlTitle;
                                        }
                                        var htmlDesc = findHtmlDesc(html);
                                        if(htmlDesc) {
                                            updateUrlDoc["$set"].desc = htmlDesc;
                                        }
                                        var htmlLinkRss = findHtmlLinkRss(html, urlDoc.url);
                                        if(htmlLinkRss) {
                                            updateUrlDoc["$set"].rssUrl = htmlLinkRss;
                                            // subscribe to URL
                                            ///subsPost({url: htmlLinkRss, parentUrl: });
                                        }
                                        
                                        findFaviAndMeta(html);
                                    } else {
                                        house.log.debug('no html from curl - just updateUrlWithDoc(updateUrlDoc)');
                                        updateUrlWithDoc(updateUrlDoc);
                                    }
    
                                    ////updateUrlWithDoc(updateUrlDoc);
    
                                } else {
    
                                    if(title) {
                                        updateUrlDoc["$set"].title = title;
                                    }
                                    var htmlDesc = findHtmlDesc(html);
                                    if(htmlDesc) {
                                        updateUrlDoc["$set"].desc = htmlDesc;
                                    }
                                    
                                    // TODO get array of rss links
                                    
                                    var htmlLinkRss = findHtmlLinkRss(html, urlDoc.url);
                                    if(htmlLinkRss) {
                                        updateUrlDoc["$set"].rssUrl = htmlLinkRss;
                                        // subscribe to URL
                                        ///subsPost({url: htmlLinkRss, parentUrl: });
                                    }
                                    
                                    var fileMeta = {
                                        owner: urlDoc.owner,
                                        src: "urls"
                                    }
                                    if(urlDoc.groups) {
                                        fileMeta.groups = urlDoc.groups;
                                    }
                                    
                                    house.utils.media.fs.getFileMime(phantomImagePath, function(err, mimeType) {
                                        //console.log('callback from house.utils.media.fs.getFileMime')
                                        if(err) {
                                            house.log.debug('err with getFileMime(phantomImagePath');
                                            house.log.err(err);
                                            findFaviAndMeta(html);
                                            return;
                                            // TODO do what we can without the image
                                        } else {
                                            // console.log(mimeType)
                                            house.utils.media.gridfs.importFile(ds.db, filesRoot, 'urls/' + encodeURIComponent(urlDoc.url) + '.png', phantomImagePath, mimeType, fileMeta, function(err, phantomImageGridStore) {
                                                if(err) {
                                                    house.log.debug('err with gridfs.importFile');
                                                    house.log.err(err);
                                                    findFaviAndMeta(html);
                                                    return;
                                                    // TODO do what we can without the image
                                                }
                                                var data = cloneGridStoreFile(phantomImageGridStore);
                                                //console.log('gridfs import file upload done');
                                                //console.log(data)
                                                if(err) {
                                                    console.log('file upload err');
                                                    console.log(err);
                                                    findFaviAndMeta(html);
                                                } else {
                                                    
                                                    fs.unlink(phantomImagePath, function(){
                                                        house.log.debug('urls endpoint - phantomImagePath tmp file removed: '+phantomImagePath);
                                                    });
        
                                                    var filesEndPoint = house.api.getEndPointByName('files');
                                                    filesEndPoint.call(this, {
                                                        session: req.session,
                                                        method: 'PUT',
                                                        url: '/' + data.id,
                                                        fields: {
                                                            "$set": {
                                                                "metadata.proc": 0
                                                            }
                                                        }
                                                    }, {
                                                        end: function() {},
                                                        data: function(resData) {
                                                            //console.log('files response for file '+data.id);
                                                            //console.log(resData);
                                                            if(resData.hasOwnProperty('image')) {
                                                                updateUrlDoc["$set"].image = resData.image;
                                                                updateUrlDoc["$push"] = {
                                                                    "updates": {
                                                                        "src": html,
                                                                        "at": new Date(),
                                                                        "image": resData.image
                                                                    }
                                                                };
                                                            }
                                                            findFaviAndMeta(html);
                                                        },
                                                        writeHead: function() {}
                                                    });
                                                }
                                            });
                                        }
                                        
                                    });
                                }
                            });
                            // phantomUrl
                        });
                    } else {
                        updateUrlWithDoc(updateUrlDoc);
                    }
                }
            });
        }

        var docId;
        var subPath = false;
        //var imagePrefix = '/images';
        //var updatesPrefix = '/updates';
        var commentsStr = 'comments';
        var commentsPrefix = '/' + commentsStr;
        
        var tagsStr = 'tags';
        var tagsPrefix = '/' + tagsStr;

        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            var subSlashI = docId.indexOf('/');

            if(subSlashI !== -1) {
                docId = docId.substr(0, subSlashI);
                docId = new ObjectID(docId);

                subPath = path.substr(subSlashI + 1);
            } else {
                docId = new ObjectID(docId);
            }
            // house.log.debug('urls endpoint - subPath: '+subPath);
        }
        /*
        if(path.length > 1 && path.indexOf('/') === 0) {
            var docId = path.substr(1);
            docId = new ObjectID(docId);
        }
        */

        // Handle Methods

        if(req.method == 'GET') {
            var query = {};

            if(docId) {
                // query._id = docId;
                // findQuery(query);

                if(subPath && subPath === commentsPrefix) {
                    query.ref = {
                        "col": "urls",
                        "id": docId
                    };

                    if(!query.sort) {
                        query.sort = 'at-';
                    }

                    ds.find(commentsCol, query, function(err, data) {
                        if(err) {
                            house.log.err(err);
                        } else if(data) {
                            res.data(data);
                        } else {
                            house.log.err(new Error('no data from mongo'));
                        }
                    });
                } else {
                    query._id = docId;
                    findQuery(query);
                }

            } else {
                if(req.query) {
                    query = req.query;

                    // query mongo id's
                    if(query.hasOwnProperty('id')) {
                        query._id = new ObjectID(query.id);
                        delete query.id;
                    }
                }
                findQuery(query);
            }
        } else if(req.method == 'HEAD') {
            var query = {};

            if(docId) {
                if(subPath && subPath === commentsPrefix) {
                    query.ref = {
                        "col": "urls",
                        "id": docId
                    };
                    ds.count(commentsCol, query, function(err, data) {
                        if(err) {
                            house.log.err(err);
                        } else {
                            if(callback) {
                                callback(data);
                            } else {
                                res.setHeader('X-Count', data);
                                res.data({});
                            }
                        }
                    });
                } else {
                    query._id = docId;
                    countQuery(query);
                }
            } else {
                if(req.query) {
                    query = req.query;
                }
                countQuery(query);
            }
        } else if(req.method == 'POST') {

            house.log.debug('POST to urls');
            if(subPath && subPath === commentsPrefix) {
                var newObject = req.fields;
                // console.log(newObject)

                newObject.ref = {
                    "col": "urls",
                    "id": docId
                };
                newObject.at = new Date();
                //console.log(req.session.data);
                newObject.user = {
                    id: req.session.data.user,
                    name: req.session.data.name
                }
                // if(req.session.data.hasOwnProperty('avatar')) {
                //     newObject.user.avatar = req.session.data.avatar;
                // }
                ds.insert(commentsCol, newObject, function(err, data) {
                    res.data(data);
                });

                // update this urls doc $inc commentCount
                var query = {
                    "_id": docId
                }
                var putDoc = {
                    "$inc": {
                        "commentCount": 1
                    }
                }
                ds.update(col, query, putDoc, function(err, data) {
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        // TODO notify comment count increase
                    }
                });

                return;
            }
            if(!req.session.data.user) {
                house.log.debug('need a logged in user');
                res.writeHead(403);
                res.end('{}');
                return;
            }
            if(path == '') {
                var newDoc = req.fields;

                if(!newDoc.hasOwnProperty('url')) {
                    res.writeHead(400);
                    res.end('{"error": "requires url"}');
                    return;
                }

                var query = {
                    url: newDoc.url,
                    "owner.id": req.session.data.user
                }; //"owner.id": req.session.data.user
                //console.log(query);
                var procOnPost = true;
                findQuery(query, function(data) {
                    var respondWithFind = function(doc) {
                        house.log.debug('url post respondWithFind');
                        var query = {
                            _id: doc.id
                        };
                        ds.find(col, query, function(err, docs) {
                            var resWithDoc = _.first(docs);
                            if(err) {
                                house.log.err(err);
                            } else {

                                cacheShareUrlHtml(resWithDoc, function() {
                                    // console.log('url post triggered cacheShareUrlHtml');
                                });

                                // insert to feed
                                insertDocToFeed(_.first(docs), function(feedDocs) {
                                    resWithDoc.feed = {
                                        id: feedDocs.id,
                                        at: feedDocs.at
                                    };
                                    resWithDoc = filterData(resWithDoc);
                                    res.data(resWithDoc);
                                    emitToRoomIn(col, 'inserted', resWithDoc);
                                });
                            }
                        });
                    }
                    if(data.length > 0) {
                        house.log.debug('url exists');

                        if(procOnPost) {
                            processUrls(_.first(data), function(err, doc) {
                                //respondWithFind(data);

                                var query = {
                                    _id: doc.id
                                };
                                ds.find(col, query, function(err, docs) {
                                    if(err) {
                                        house.log.err(err);
                                    } else {
                                        var resWithDoc = _.first(docs);
                                        resWithDoc = filterData(resWithDoc);
                                        res.data(resWithDoc);
                                        emitToRoomIn(col, 'updated', resWithDoc);

                                        cacheShareUrlHtml(resWithDoc, function() {
                                            console.log('url post (existing doc) triggered cacheShareUrlHtml');
                                        });
                                    }
                                });
                            }, true);
                        } else {
                            res.data(_.first(data));
                        }
                    } else {
                        house.log.debug('new url');
                        newDoc.at = new Date();
                        newDoc.owner = {
                            id: req.session.data.user,
                            name: req.session.data.name
                        }
                        ds.insert(col, newDoc, function(err, data) {
                            if(err) {
                                house.log.err(err);
                                res.end('error');
                            } else {
                                incUserUrls(req.session.data.user, 1);

                                if(procOnPost) {
                                    processUrls(data, function(err, data) {
                                        respondWithFind(data);
                                    });
                                } else {
                                    respondWithFind(data);
                                }
                            }
                        });
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
                query['owner.id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                var putDoc = req.fields;
                // console.log(putDoc);
                var updateGroups = false;
                var insertToFeed = false;
                var removeFromFeed = false;
                for(var k in putDoc) {
                    if(putDoc.hasOwnProperty(k) && k.substr(0, 1) == '$') {
                        for(var colName in putDoc[k]) {
                            if(colName == 'groups') {
                                updateGroups = true;
                            }
                            if(colName == 'owner') {

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
                
                ds.update(col, query, putDoc, function(err, data) {
                    if(err) {
                        house.log.err(err);
                        res.end('error');
                    } else {
                        ds.find(col, query, function(err, data) {
                            var updatedDoc = _.first(data);
                            if(updateGroups) {
                                
                                // Update Cache
                                cacheShareUrlHtml(updatedDoc, function() {
                                    console.log('url doc groups update triggered cacheShareUrlHtml');
                                });

                                // Update files collection

                                var updateFilesDoc = false;
                                var updateCheckinDoc = false;
                                if(updatedDoc.hasOwnProperty('groups')) {
                                    updateFilesDoc = {
                                        "$set": {
                                            "metadata.groups": updatedDoc.groups
                                        }
                                    }
                                    updateCheckinDoc = {
                                        "$set": {
                                            "groups": updatedDoc.groups
                                        }
                                    }
                                    ds.update(colFiles, {
                                        "metadata.refs": {
                                            col: "urls",
                                            id: docId
                                        }
                                    }, updateFilesDoc, {
                                        multi: true,
                                        safe: true
                                    }, function(err, docs) {
                                        //house.log.debug('updated files with new groups via url');
                                    });

                                    var setGroups = {
                                        "$set": {
                                            groups: updatedDoc.groups
                                        }
                                    };

                                    // Update images collection

                                    if(updatedDoc.hasOwnProperty('image')) {
                                        imagesEndPoint({
                                            session: req.session,
                                            method: 'PUT',
                                            url: '/' + updatedDoc.image.id,
                                            fields: setGroups
                                        }, {
                                            end: function() {},
                                            data: function(data) {},
                                            writeHead: function() {}
                                        });
                                    }
                                    if(updatedDoc.hasOwnProperty('ogImage')) {
                                        imagesEndPoint({
                                            session: req.session,
                                            method: 'PUT',
                                            url: '/' + updatedDoc.ogImage.id,
                                            fields: setGroups
                                        }, {
                                            end: function() {},
                                            data: function(data) {},
                                            writeHead: function() {}
                                        });
                                    }

                                    // Update child urls
                                    // TODO as rest PUT
                                    var query = {
                                        parentUrl: updatedDoc.url
                                    };
                                    ds.update(col, query, setGroups, function(err, data) {
                                        if(err) {
                                            house.log.err(err);
                                        } else {
                                            house.log.debug('updated urls with parent url');
                                            house.log.debug(data.length);
                                        }
                                    });
                                    
                                    // Now public lets check for social shares
                                    updateShareCounts(updatedDoc);
                                } else {
                                    var unsetGroups = {
                                        "$unset": {
                                            groups: true
                                        }
                                    };
                                    // unset groups privacy
                                    updateFilesDoc = {
                                        "$set": {
                                            "metadata.groups": []
                                        }
                                    }
                                    ds.update(colFiles, {
                                        "metadata.refs": {
                                            col: "urls",
                                            id: docId
                                        }
                                    }, updateFilesDoc, {
                                        multi: true,
                                        safe: true
                                    }, function(err, docs) {
                                        //house.log.debug('updated files with new groups via url');
                                    });
                                    if(updatedDoc.hasOwnProperty('image')) {
                                        imagesEndPoint({
                                            session: req.session,
                                            method: 'PUT',
                                            url: '/' + updatedDoc.image.id,
                                            fields: unsetGroups
                                        }, {
                                            end: function() {},
                                            data: function(data) {},
                                            writeHead: function() {}
                                        });
                                    }
                                    if(updatedDoc.hasOwnProperty('ogImage')) {
                                        imagesEndPoint({
                                            session: req.session,
                                            method: 'PUT',
                                            url: '/' + updatedDoc.ogImage.id,
                                            fields: unsetGroups
                                        }, {
                                            end: function() {},
                                            data: function(data) {},
                                            writeHead: function() {}
                                        });
                                    }

                                    // Update child urls
                                    var query = {
                                        parentUrl: updatedDoc.url
                                    };
                                    ds.update(col, query, unsetGroups, function(err, data) {
                                        if(err) {
                                            house.log.err(err);
                                        } else {
                                            house.log.debug('updated urls with parent url');
                                            house.log.debug(data.length);
                                        }
                                    });
                                }
                            }
                            var putRespond = function(data) {
                                if(insertToFeed) {
                                    insertDocToFeed(updatedDoc, function(feedDocs) {
                                        var resWithDoc = updatedDoc;
                                        resWithDoc.feed = {
                                            id: feedDocs.id,
                                            at: feedDocs.at
                                        };
                                        res.data(resWithDoc);
                                        emitToRoomIn(col, 'updated', resWithDoc);
                                    });
                                } else if(updatedDoc.hasOwnProperty('feed')) {
                                    updateDocInFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoomIn(col, 'updated', updatedDoc);
                                } else if(removeFromFeed) {
                                    removeDocFromFeed(updatedDoc);
                                    res.data(updatedDoc);
                                    emitToRoomIn(col, 'updated', updatedDoc);
                                } else {
                                    res.data(data);
                                    emitToRoomIn(col, 'updated', data);
                                }
                            }
                            if(doProc) {
                                processUrls(data, function(err, data) {
                                    data = filterData(data);
                                    putRespond(data);
                                });
                            } else {
                                data = filterData(data);
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

            if(docId && subPath && subPath.indexOf(commentsPrefix) === 0) {
                //if(subPath && subPath === commentsPrefix) {
                var comment_id = new ObjectID(subPath.substr(commentsPrefix.length + 1));
                house.log.debug('delete comment id:');
                console.log(comment_id);
                ds.remove(commentsCol, {
                    "_id": comment_id
                }, function(err, data) {
                    if(err) {
                        house.log.err(err);
                    } else {
                        house.log.debug(data);
                    }
                    res.data(data);
                });
                return;
            }

            if(req.session.data.hasOwnProperty('groups') && req.session.data.groups.indexOf('admin') !== -1) {

            } else {
                query['owner.id'] = req.session.data.user;
            }
            if(docId) {
                query._id = docId;
                ds.find(col, query, function(err, data) {
                    var doc = _.first(data);
                    removeDocFromFeed(doc);
                    ds.remove(col, query, function(err, data) {
                        if(err) {
                            house.log.err(err);
                            res.end('error');
                        } else {
                            incUserUrls(req.session.data.user, -1);
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