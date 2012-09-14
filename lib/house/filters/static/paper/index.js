// # Static File Filter
//
// ## Paperboy Static File Delivery
//
// This filter requires a value for the option *publicFolder* to deliver files from
//
exports = module.exports = function(house, options) {
    if(!options) {
        var filter = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('static')); });
        options = (filter.static && filter.static.hasOwnProperty('paper')) ? filter.static.paper : {};
    }
    
    var paperboy = require("paperboy");
    
    var handleReq = function(req, res, next) {
        if(req.urlRouted) {
            req.url = req.urlRouted;
        }
        paperboy.deliver(options.publicFolder, req, res)
            .addHeader("Expires", 300)
            .addHeader("X-House", "Node")
            .before(function() {})
            .after(function(statCode) {})
            .error(function(statCode, msg) {
                res.writeHead(statCode, {
                    "Content-Type": "text/plain"
                });
                res.end("Error " + statCode);
            })
            .otherwise(function(err) {
                req.url = req.urlOrig;
                if(options.otherwise) {
                    req.urlRouted = options.otherwise;
                    handleReq(req, res);
                } else {
                    if (next) next();
                }
            });
    };
    return handleReq;
};
