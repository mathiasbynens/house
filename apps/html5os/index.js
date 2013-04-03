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
                    'posts',
                    'todos',
                    'urls',
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
                    , "otherwise": 'index.html'
                }
            }
        };
        routes.push(o);
    }
    app.config = {routes: routes};
    if(routes) {
        house.addRoutes(routes);
    }
    return app;
});
