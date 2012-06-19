// # API Filter
//
// ## REST API
//

(exports = module.exports = function(options){
    var handleReq = function(req, res, next) {
        //next();
        res.end('api '+req.method+' request to '+req.url);
    };
    return handleReq;
});
