// # Static File Filter
//
// ## Paperboy Static File Delivery
//
// This filter requires a value for the option *publicFolder* to deliver files from
//
exports = module.exports = function(options) {
    var paperboy = require("paperboy");
    var handleReq = function(req, res, next) {
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
                if (next) next();
            });
    };
    return handleReq;
};