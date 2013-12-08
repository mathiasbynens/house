//
// # Account App
//
(exports = module.exports = function(house){
    var app = {};
    var htmlApps = ['account',
                    'analytics',
                    'applications',
                    'chat',
                    'checkins',
                    'clock',
                    'desktop',
                    'feed',
                    'files',
                    'fs',
                    'images',
                    'msgs',
                    'news',
                    'pages',
                    //'posts',
                    'todos',
                    //'urls',
                    'users',
                    'vault',
                    'wallpaper'];
    
    var routes = [];
    
    for(var i in htmlApps) {
        var o = {};
        var a = htmlApps[i];
        o[a] = {
            "static": {
                "send": {
                    "publicFolder": __dirname + "/"+a
                    //, "cachedHtml": process.cwd() + "/cache"
                    , "otherwise": 'index.html'
                }
            }
        };
        routes.push(o);
    }
    routes.push({"posts": {"static": {
        "send": {
            "publicFolder": __dirname + "/posts"
            , "cachedHtml": process.cwd() + "/cache"
            , "otherwise": 'index.html'
        }
    }}});
    routes.push({"urls": {"static": {
        "send": {
            "publicFolder": __dirname + "/urls"
            , "cachedHtml": process.cwd() + "/cache"
            , "otherwise": 'index.html'
        }
    }}});
    
    // Offer default app exlusions 
    if(house.config.excludeApps) {
        for(var i in house.config.excludeApps) {
            var excludedApp = house.config.excludeApps[i];
            for(var r in routes) {
                for(var k in routes[r]) {
                    if(k == excludedApp) {
                        delete routes[r][k];
                    }
                }
            }
        }
    }
    
    app.config = {routes: routes};
    if(routes) {
        house.addRoutes(routes);
    }
    return app;
});
