exports = module.exports.config = {
    version: 0.001,
    routes: [ {
        wallpaper: {
            "static": {
                paper: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
