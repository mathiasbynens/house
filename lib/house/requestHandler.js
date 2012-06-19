// # Request Handler
//
// ## Filter Chain
//
// This request handler expects filters in a chain with function signatures (req, res, next)
// 
(exports = module.exports = function(config){
    // Filters are required from the config
    //
    if(!config.hasOwnProperty('filters')) {
        throw new Error("Filters are required from config");
    }
    
    //
    // ## Request Filters
    //
    var requestFilters = require('./filters')(config);
    
    //
    // ### Welcome HTTP Request! 
    //
    // Our request handler passes the request and response object through our filters
    //
    var reqHandler = function(req, res) {
        var x = 0;
        var getNextFilter = function(){ var f = requestFilters[x]; x++; return f; }
        var nextFilter = function() {
            if(requestFilters.length > x) {
                var nextFilterFn = getNextFilter();
                if(nextFilterFn) {
                    nextFilterFn(req, res, nextFilter);
                }
            }
        };
        nextFilter();
    };
    
    return reqHandler;
});