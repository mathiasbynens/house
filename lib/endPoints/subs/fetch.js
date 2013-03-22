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
        console.log('forked - newUrlData');
        //console.log(newUrlData);
        ds.update('subs', {"_id": docId}, {"$set": {"urlDoc": newUrlData}}, function(err, data) {
        });
        
        resWithDoc.urlDoc = newUrlData;
        
        process.send({ "updatedSubDoc": resWithDoc });
        
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
