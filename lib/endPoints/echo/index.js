// # API Endpoint ECHO
//
(exports = module.exports = function(){
    var handleReq = function(req, res, next) {
        if(req.fields) {
            res.end(JSON.stringify(req.fields));
        } else {
            res.end(req.url);
        }
    };
    return handleReq;
});
