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
                "publicFolder": __dirname + "/../"+a
                , "otherwise": 'index.html'
            }
        }
    };
    routes.push(o);
}

exports = module.exports.config = {
    routes: routes
};
