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
            house.log.debug('update urls '+data.length);
            if(data.length > 0) {

		var procDataDoc = function() {
			console.log(data.length);
			var doc = data.pop();
			if(doc) {
				var updateDoc = {
                        $set: {proc: 0}
                    }
                    var sess = {
                        data: {
                            user: doc.owner.id
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
return;
                _.each(data, function(doc,i) {
			console.log(i)
                    //console.log(doc);
                    var updateDoc = {
                        $set: {proc: 0}
                    }
                    var sess = {
                        data: {
                            user: doc.owner.id
                        }
                    }
return;
                    urlsEndPoint({session: sess, method: 'PUT', url: '/'+doc.id, fields: updateDoc}, {end:function(){}, data:function(newFeedData){
                        house.log.debug('subs url feed updated');
                    },writeHead:function(){}});
                });
            }
        }
    });
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
});
