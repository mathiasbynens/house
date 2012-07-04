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
    } else {
        house.api.endPoints = require(process.cwd()+'/endPoints')(house);
    }
    
    var handleReq = function(req, res, next) {
        
        //
        // endpoints can respond using this method to handle the common rest request,
        // taking the accept type into consideration
        //
        res.data = function(data){
            
            var sendResJson = function() {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
            }
            var sendResText = function() {
                if(typeof data !== 'string') {
                    data = JSON.stringify(data, null, 4);
                }
                res.end(data);
            }
            
            if(req.headers.hasOwnProperty('accept')) {
                var acceptType = req.headers.accept;
                
                if(acceptType.indexOf('json') !== -1) {
                    sendResJson();
                } else {
                    sendResText();
                }
            } else {
                sendResJson();
            }
        }
        
        // route to known endpoints
        
        for(var i in house.api.endPoints) {
            for(var path in house.api.endPoints[i]) {
                if(req.url.indexOf(path) === 1) {
                    //house.log.debug('api endpoint '+path);
                    req.url = req.url.substr(path.length+1);
                    house.api.endPoints[i][path].apply(this, arguments);
                    return;
                }
            }
        }
        
        next();
    };
    return handleReq;
});
