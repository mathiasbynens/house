// # API Filter
//
// ## REST API
//
var util = require('util');
(exports = module.exports = function(house, options){
    house.api = {};
    if(!options) {
        var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('api')); });
        options = (filter && filter.api && filter.api.hasOwnProperty('rest')) ? filter.api.rest : {};
    }
        
    if(options.hasOwnProperty('endPoints')) {
        house.api.endPoints = require(options.endPoints)(house);
    }
    house.log.debug(house.api.endPoints);
    
    var handleReq = function(req, res, next) {
        
        //
        // endpoints can respond using this method to handle the common rest request,
        // taking the accept-type into consideration
        //
        res.data = function(data){
            
            // TODO based on the response accept type, respond as appropriate
            
            res.end(JSON.stringify(data));
        }
        
        house.log.debug(req.url);
        // route to known endpoints
        
        for(var i in house.api.endPoints) {
            for(var path in house.api.endPoints[i]) {
                if(req.url.indexOf(path) === 1) {
                    house.log.debug('api endpoint '+path);
                    req.url = req.url.substr(path.length+1);
                    house.api.endPoints[i][path].apply(this, arguments);
                    return;
                }
            }
        }
        
        //next();
        res.end('api');
    };
    return handleReq;
});
