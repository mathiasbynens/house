exports = module.exports.config = {
    version: 0.001,
    favicon: 'favicon.ico',
    iosicon: 'iosicon.png',
    routes: [ {
        desktop: {
            "static": {
                send: {
                    publicFolder: __dirname + "/../web"
                    , otherwise: 'index.html'
                }
            }
        }
    } ]
};
