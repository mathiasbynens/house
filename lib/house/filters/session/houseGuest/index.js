// # Session Filter
//
// ## House Guest
//

(exports = module.exports = function(options){
    
    var handleReq = function(req, res, next) {
        next();
    };
    return handleReq;
});
