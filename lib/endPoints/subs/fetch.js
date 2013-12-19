var moment = require("moment");
var urlsEndPoint;
var urlsCol;
var housejs = require(__dirname+"/../../house");
var house;
var ds;
var fetchFeeds = function() {
    var now = new Date();
    var ex = moment().subtract('hours', 3);
    var query = {
        "channel.last": {
            $lt: ex.toDate()
        }
    };
    ds.find(urlsCol, query, function(err, data) {
        if(err) {
            house.log.err(err);
        } else {
            house.log.debug(data.length+' url channels need updating');
            if(data.length > 0) {
                var procDataDoc = function() {
                    console.log(data.length+' remaining urls to update');
                    var doc = data.pop();
                    if(doc) {
                        var updateDoc = {
                            $set: {proc: 0}
                        }
                        var sess = {
                            data: {
                                user: doc.owner.id,
                                name: doc.owner.name
                            }
                        }
                        urlsEndPoint({session: sess, method: 'PUT', url: '/'+doc.id, fields: updateDoc}, {end:function(){}, data:function(newFeedData){
                            house.log.debug('subs url feed updated');
                            if(data.length > 0) {
                                procDataDoc();
                            }
                        },writeHead:function(){}});
                    }
                }
                procDataDoc();
            }
        }
    });
}

var postSubUrl = function(resWithDoc) {
    if(typeof resWithDoc.owner.id == 'string') {
        resWithDoc.owner.id = new mongo.ObjectID(resWithDoc.owner.id);
    }
    if(typeof resWithDoc.id == 'string') {
        resWithDoc.id = new mongo.ObjectID(resWithDoc.id);
    }
    var docId = resWithDoc.id;
    var newUrl = {url: resWithDoc.url, groups: ['public'], ref: {col: 'subs', id: docId}};
    var sess = {
        data: {
            user: resWithDoc.owner.id,
            name: resWithDoc.owner.name
        }
    }
    house.log.debug('forked - lets post a url from this sub')
    house.log.debug(newUrl)
    //var nowBeforePost = new Date();
    urlsEndPoint({session: sess, method: 'POST', url: '', fields: newUrl}, {end:function(){}, data:function(newUrlData){
        if(_.isArray(newUrlData)) {
            newUrlData = _.first(newUrlData);
        }
        house.log.debug('forked - newUrlData');
        
        
        if(newUrlData.hasOwnProperty('rssUrl')) {
            house.log.debug('this sub url has a <link type rss+xml> url: '+newUrlData.rssUrl);
            var newRssUrl = {url: newUrlData.rssUrl, groups: ['public'], parentUrl: resWithDoc.url};
            house.log.debug('rssURL - post an rss url from this sub');
            house.log.debug(newRssUrl);
            urlsEndPoint({session: sess, method: 'POST', url: '', fields: newRssUrl}, {end:function(){}, data:function(rssUrlData){
                house.log.debug('forked - sub url posted'); 
                if(_.isArray(rssUrlData)) {
                    rssUrlData = _.first(rssUrlData);
                }
                ds.update('subs', {"_id": docId}, {"$set": {"url": rssUrlData.url, "urlDoc": rssUrlData, "channelUrlDoc": newUrlData}}, function(err, data) {
                    house.log.debug('updated sub with channelUrl rss url');
                });
                resWithDoc.url = rssUrlData.url;
                resWithDoc.urlDoc = rssUrlData;
                resWithDoc.channelUrlDoc = newUrlData;
                
                resWithDoc.urlDoc = newUrlData;
                process.send({ "updatedSubDoc": resWithDoc });
                
            },writeHead:function(){}});
        } else {
            ds.update('subs', {"_id": docId}, {"$set": {"urlDoc": newUrlData}}, function(err, data) {
            });
            resWithDoc.urlDoc = newUrlData;
            process.send({ "updatedSubDoc": resWithDoc });
        }
        /*
        //console.log(newUrlData);
        ds.update('subs', {"_id": docId}, {"$set": {"urlDoc": newUrlData}}, function(err, data) {
        });
        
        resWithDoc.urlDoc = newUrlData;
        
        process.send({ "updatedSubDoc": resWithDoc });
        */
    },writeHead:function(){}});
}
  
urlsCol = 'urls';
process.on('message', function(m) {
    if(m.hasOwnProperty('config')) {
        var config = m.config.config;
        house = new housejs(config);
        house.initFilters();
        ds = house.dataSources.mongo;
        if(ds.isConnected) {
            urlsEndPoint = house.api.getEndPointByName(urlsCol);
        } else {
            ds.connected(function(){
                urlsEndPoint = house.api.getEndPointByName(urlsCol);
            });
        }
        return;
    }
    if(m.hasOwnProperty('fetchFeeds')) {
        fetchFeeds();
    }
    if(m.hasOwnProperty('postSubUrl')) {
        postSubUrl(m.postSubUrl);
    }
});
