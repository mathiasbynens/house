// # API Endpoint APPS
//
(exports = module.exports = function(house){
    
    
    var handleReq = function(req, res, next) {
        // TODO cache this when apps load, not per request
        var appsList = [];
        for(var app in house.apps) {
            if(house.apps.hasOwnProperty(app)) {
                
                var appUrl = '/';
                
                for(var i in house.apps[app].config.routes) {
                    for(var routePath in house.apps[app].config.routes[i]) {
                        appUrl = '/'+routePath+'/';
                        break;
                    }
                }
                
                appsList.push({
                    "name": app,
                    "url": appUrl
                }); //house.apps[app];
                
                house.apps[app].url = appUrl;
            }
        }
        if(req.fields) {
            res.data(req.fields);
        } else {
            if(req.method == 'GET') {
                if(req.url.length > 1 && req.url.indexOf('/') === 0) {
                    
                    var id = req.url.substr(req.url.indexOf('/')+1);
                    if(id.indexOf('/') !== -1) {
                        id = id.substr(0, id.indexOf('/'));
                    }
                    
                    res.data(house.apps[id]);
                } else {
                    res.data(appsList);
                }
            } else {
                next();
            }
        }
    };
    return handleReq;
});

