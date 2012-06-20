// # Logger Filter
//
// ## Simple Log
//
(exports = module.exports = function(house){
    var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('logger')); });
    var options = (filter.logger && filter.logger.hasOwnProperty('simpleLog')) ? filter.logger.simpleLog : {};
    
    //
    // Pattern for identifying a request
    //
    var getLogStrFromReq = function(req) {
        var l = '';
        if(req.ip) {
            l = ip + ' ';
        }
        l += req.method+' '+req.url;
        return l;
    }
    
    //
    //  Log the request and response
    //
    var handleReq = function(req, res, next) {
        var reqStr = getLogStrFromReq(req);
        
        var _writeHead = res.writeHead;
        res.writeHead = function(statusCode, responsePhrase, headers) {
            _writeHead.apply(this, arguments);
            house.log.info(reqStr+' ' +statusCode);
        }
        
        house.log.info(reqStr);
        next();
    };
    
    return handleReq;
});
