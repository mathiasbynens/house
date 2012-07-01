// # Routing Filter
//
// ## Simple Router
//
// This simple router takes an array of routes to match against the beginning of the request url
//
// Each route key should be the path to match
// and the value should be a filter
//
(exports = module.exports = function(house){
    var filterConfig = _.find(house.config.filters, function(f){ return (f.hasOwnProperty('router')); });
    var options = (filterConfig.router && filterConfig.router.hasOwnProperty('simpleRoute')) ? filterConfig.router.simpleRoute : {};
    var routes = [];
    if(!options || !options.hasOwnProperty('routes')) {
        // TODO default routes or error
    } else {
        routes = options.routes;
    }
    
    var router = {};
    
    //
    // Parse our routes and require the referenced filters
    //
    var includeRoutes = function(routes) {
        for(var r in routes) {
            for(var routePath in routes[r]) {
                var aRoute = routes[r][routePath];
                var filter;
                
                for(var filterType in aRoute) {
                    var filterTypeName = '';
                    var filterTypeOptions = {};
                    for(var filterName in aRoute[filterType]) {
                        filterTypeName = '/'+filterName;
                        filterTypeOptions = aRoute[filterType][filterName];
                    }
                    var reqPath = '../../'+filterType+filterTypeName;
                    var f = require(reqPath)
                    filter = new f(house, filterTypeOptions);
                }
                if(!router[r]) {
                    router[r] = {};
                }
                router[r][routePath] = filter;
            }
        }
    }
    includeRoutes(routes);
    
    house.addRoutes = function(routes) {
        includeRoutes(routes);
    }
    
    var handleReq = function(req, res, next) {
        // 
        //  Route the requst to our API, or static files.
        //
        for(var r in router) {
            for(var routePath in router[r]) {
                if(req.url.indexOf(routePath) === 1) {
                    var matchedRoute = router[r][routePath];
                    req.url = req.url.substr(routePath.length+1);
                    if(req.url == '') req.url = '/';
                    matchedRoute.apply(this, arguments);
                    return;
                }
            }
        }
        // No router matches - go to next filter
        next();
    };
    return handleReq;
});
