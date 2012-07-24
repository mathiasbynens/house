// # API Endpoint APPS
//
(exports = module.exports = function(house){
    
    
    var handleReq = function(req, res, next) {
        var path = req.hasOwnProperty('urlRouted') ? req.urlRouted : req.url;
        house.log.debug('api endpoint url: '+req.url);
        if(req.fields) {
            res.data(req.fields);
        } else {
            if(req.method == 'GET') {
                if(path.length > 1 && path.indexOf('/') === 0) {
                    
                    var id = path.substr(path.indexOf('/')+1);
                    if(id.indexOf('/') !== -1) {
                        id = id.substr(0, id.indexOf('/'));
                    }
                    
                    res.data(house.apps[id]);
                } else {
                    res.data(house.appsList);
                }
            } else {
                next();
            }
        }
    };
    return handleReq;
});

